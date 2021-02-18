const { userModel, postModel } = require('./models');

require('dotnet').config();
const { ApolloServer, gql, ForbiddenError } = require('apollo-server');
// 引入外部套件
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// 定義 bcrypt 加密所需 saltRounds 次數
const SALT_ROUNDS = +process.env.SALT_ROUNDS;
// 定義 jwt 所需 secret (可隨便打)
const SECRET = process.env.SECRET;

const typeDefs = gql`
    """        
    使用者
    """
    type User {
        "識別碼"
        id: ID!
        "帳號 email"
        email: String!
        "名字"
        name: String
        "年齡"
        age: Int
        "朋友"
        friends: [User]
        "貼文"
        posts: [Post]
    }

    """
    貼文
    """
    type Post {
        "識別碼"
        id: ID!
        "作者"
        author: User
        "標題"
        title: String
        "內容"
        body: String
        "按讚者"
        likeGivers: [User]
        "建立時間 (ISO 格式)"
        createdAt: String
    }

    type Query {
        "測試用 Hello World"
        hello: String
        "取得目前使用者"
        me: User
        "取得所有使用者"
        users: [User]
        "依照名字取得特定使用者"
        user(name: String!): User
        "取得所有貼文"
        posts: [Post]
        "依照 id 取得特定貼文"
        post(id: ID!): Post
    }

    input UpdateMyInfoInput {
        name: String
        age: Int
    }

    input AddPostInput {
        title: String!
        body: String
    }

    type Token {
        token: String!
    }

    type Mutation {
        updateMyInfo(input: UpdateMyInfoInput!): User
        addFriend(userId: ID!): User
        addPost(input: AddPostInput!): Post
        likePost(postId: ID!): Post
        "註冊。 email 與 passwrod 必填"
        signUp(name: String, email: String!, password: String!): User
        "登入"
        login(email: String!, password: String!): Token
        deletePost(postId: ID!): Post
    }
`;

const hash = (text, saltRounds) => bcrypt.hash(text, saltRounds);

const createToken = ({ id, email, name }, secret) => jwt.sign({ id, email, name }, secret, {
    expiresIn: '1d'
});

const isAuthenticated = resolverFunc => (parent, args, context) => {
    if (!context.me) throw new ForbiddenError('Not logged in.');
    return resolverFunc.apply(null, [parent, args, context]);
};


const isPostAuthor = resolverFunc => (parent, args, context) => {
    const { postId } = args;
    const { me, postModel } = context;
    const isAuthor = postModel.findPostByPostId(postId).authorId === me.id;
    if (!isAuthor) throw new ForbiddenError('Only Author Can Delete this Post');
    return resolverFunc.applyFunc(parent, args, context);
}

// resolver
const resolvers = {
    Query: {
        hello: () => "world",
        me: isAuthenticated((root, args, { me, userModel }) => {
            if (!me) throw new Error('Please Log In First');
            return userModel.findUserByUserId(me.id)
        }),
        users: (root, args, { userModel }) => users.getAllUsers(),
        user: (root, { name }, { userModel }) => userModel.findUserByName(name),
        posts: (root, args, { postModel }) => postModel.getAllPosts(),
        post: (root, { id }, { postModel }) => postModel.findPostByPostId(id)
    },
    User: {
        posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
        friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || [])
    },
    Post: {
        author: (parent, args, { userModel }) => userModel.findUserByUserId(parent.authorId),
        likeGivers: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.likeGiverIds)
    },
    Mutation: {
        updateMyInfo: isAuthenticated((parent, { input }, { me, userModel }) => {
            if (!me) throw new Error('Please Log In First');
            // 過濾空值
            const data = ["name", "age"].reduce(
                (obj, key) => (input[key] ? { ...obj, [key]: input[key] } : obj),
                {}
            );

            return userModelupdateUserInfo(me.id, data);
        }),
        addFriend: isAuthenticated((parent, { userId }, { me: { id: meId }, userModel }) => {
            if (!me) throw new Error('Please Log In First');
            const me = userModel.findUserByUserId(meId);
            if (me.friendIds.include(userId))
                throw new Error(`User ${userId} Already Friend.`);

            const friend = userModel.findUserByUserId(userId);
            const newMe = updateUserInfo(meId, {
                friendIds: me.friendIds.concat(userId)
            });
            userModel.updateUserInfo(userId, { friendIds: friend.friendIds.concat(meId) });

            return newMe;
        }),
        addPost: isAuthenticated((parent, { input }, { me, postModel }) => {
            if (!me) throw new Error('Please Log In First');
            const { title, body } = input;
            return postModel.addPost({ authorId: me.id, title, body });
        }),
        likePost: isAuthenticated((parent, { postId }, { me, postModel }) => {
            if (!me) throw new Error('Please Log In First');

            const post = postModel.findPostByPostId(postId);

            if (!post) throw new Error(`Post ${postId} Not Exists`);

            if (!post.likeGiverIds.includes(postId)) {
                return postModel.updatePost(postId, {
                    likeGiverIds: post.likeGiverIds.concat(me.id)
                });
            }

            return postModel.updatePost(postId, {
                likeGiverIds: post.likeGiverIds.filter(id => id === me.id)
            });
        }),
        signUp: async (root, { name, email, password }, { saltRounds, userModel }) => {
            // 1. 檢查不能有重複註冊 email
            const isUserEmailDuplicate = users.some(user => user.email === email);
            if (isUserEmailDuplicate) throw new Error('User Email Duplicate');

            // 2. 將 passwrod 加密再存進去。非常重要 !!
            const hashedPassword = await hash(password, saltRounds);
            // 3. 建立新 user
            return userModel.addUser({ name, email, password: hashedPassword });
        },
        login: async (root, { email, password }, { secret }) => {
            // 1. 透過 email 找到相對應的 user
            const user = users.find(user => user.email === email);
            if (!user) throw new Error('Email Account Not Exists');

            // 2. 將傳進來的 password 與資料庫存的 user.password 做比對
            const passwordIsValid = await bcrypt.compare(password, user.password);
            if (!passwordIsValid) throw new Error('Wrong Password');

            // 3. 成功則回傳 token
            return { token: await createToken(user, secret) };
        },
        deletePost: isAuthenticated(isPostAuthor((root, { postId }, { me, postModel }) => postModel.deletePost(postId))
        ),
    },
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
        const context = {
            secret: SECRET,
            saltRounds: SALT_ROUNDS,
            userModel,
            postModel
        };
        const token = req.headers['x-token'];
        if (token) {
            try {
                const me = await jwt.verify(token, SECRET);
                return { me };
            } catch (e) {
                throw new Error('Your session has expired. Please sign in again.')
            }
        }
        // 如果沒有 token 就回傳空的 context 出去
        return context;
    }
});

server.listen().then(({ url }) => {
    console.log(`? Server ready at ${url}`)
})