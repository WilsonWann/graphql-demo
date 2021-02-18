const { gql, ForbiddenError, AuthenticationError } = require('apollo-server')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

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

    extend type Query {
        "取得目前使用者"
        me: User
        "取得所有使用者"
        users: [User]
        "依照名字取得特定使用者"
        user(name: String!): User
    }

    input UpdateMyInfoInput {
        name: String
        age: Int
    }

    type Token {
        token: String!
    }

    type Mutation {
        updateMyInfo(input: UpdateMyInfoInput!): User
        addFriend(userId: ID!): User
        "註冊。 email 與 passwrod 必填"
        signUp(name: String, email: String!, password: String!): User
        "登入"
        login(email: String!, password: String!): Token
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

const resolvers = {
    Query: {
        hello: () => "world",
        me: isAuthenticated((root, args, { me, userModel }) => {
            if (!me) throw new Error('Please Log In First');
            return userModel.findUserByUserId(me.id)
        }),
        users: (root, args, { userModel }) => users.getAllUsers(),
        user: (root, { name }, { userModel }) => userModel.findUserByName(name),
    },
    User: {
        posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
        friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || [])
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
    },
};

module.exports = {
    typeDefs,
    resolvers
};
