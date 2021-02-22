// 1. 引入外部套件
const { gql, ForbiddenError, AuthenticationError, SchemaDirectiveVisitor } = require('apollo-server')
const { defaultFieldResolver } = require('graphql');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

// 2. Directive 實作
class UpperCaseDirective extends SchemaDirectiveVisitor {
    // 2-1. ovveride field Definition 的實作
    visitFieldDefinition(field) {
        const { resolve = defaultFieldResolver } = field;
        // 2-2. 更改 field 的 resolve function
        field.resolve = async function (...args) {
            // 2-3. 取得原先 field resolver 的計算結果 (因為 field resolver 傳回來的有可能是 promise 故使用 await)
            const result = await resolve.apply(this, args);
            // 2-4. 將得到的結果再做預期的計算 (toUpperCase)
            if (typeof result === 'string') {
                return result.toUpperCase();
            }
            // 2-5. 回傳最終值 (給前端)
            return result;
        }
    }
}

class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = async function (...args) {
            const context = args[2];
            // 檢查有沒有 context.me
            if (!context.me) throw new Error('Not logged in!');

            // 確定有 context.me 後才進入 Resolve Function
            const result = await resolve.apply(this.args);
            return result;
        }
    }
}
// 3. 定義新的 Directive
const typeDefs = gql`
    directive @upper on FIELD_DEFINITION
    directive @isAuthenticated on FIELD_DEFINITION

    """
    高度單位
    """
    enum HeightUnit {
        "公尺"
        METRE
        "公分"
        CENTIMETRE
        "英尺 (1 英尺 = 30.48 公分)"
        FOOT
    }

    """
    重量單位
    """
    enum WeightUnit {
        "公斤"
        KILOGRAM
        "公克"
        GRAM
        "磅 (1 磅 = 0.45359237 公斤)"
        POUND
    }
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
        "身高 (預設為 CENTIMETRE)"
        height(unit: HeightUnit = CENTIMETRE): Float
        "體重 (預設為 KILOGRAM)"
        weight(unit: WeightUnit = KILOGRAM): Float @deprecated (reason: "It's secret")
    }

    extend type Query {
        hello: String @upper
        "取得目前使用者"
        me: User @isAuthenticated
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

    extend type Mutation {
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
        hello: (root, args, context) => {
            return "Hello World!";
        },
        // me: isAuthenticated((root, args, { me, userModel }) => {
        //     if (!me) throw new Error('Please Log In First');
        //     return userModel.findUserByUserId(me.id)
        // }),
        me: (root, args, { me, userModel }) => userModel.findUserByUserId(me.id),
        users: (root, args, { userModel }) => userModel.getAllUsers(),
        user: (root, { name }, { userModel }) => userModel.findUserByName(name),
    },
    User: {
        posts: (parent, args, { postModel }) => postModel.filterPostsByUserId(parent.id),
        friends: (parent, args, { userModel }) => userModel.filterUsersByUserIds(parent.friendIds || []),
        // 對應到 Schema 的 User.height
        height: (parent, args) => {
            const { unit } = args;
            // 可注意到 Enum type 進到 javascript 就變成了 String 格式
            // 另外支援 default 值 CENTIMETRE
            if (!unit || unit === "CENTIMETRE") return parent.height;
            else if (unit === "METRE") return parent.height / 100;
            else if (unit === "FOOT") return parent.height / 30.48;
            throw new Error(`Height unit "${unit}" not supported.`);
        },
        // 對應到 Schema 的 User.weight
        weight: (parent, args, context) => {
            const { unit } = args;
            // 支援 default 值 KILOGRAM
            if (!unit || unit === "KILOGRAM") return parent.weight;
            else if (unit === "GRAM") return parent.weight * 100;
            else if (unit === "POUND") return parent.weight / 0.45359237;
            throw new Error(`Weight unit "${unit}" not supported.`);
        }
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
    resolvers,
    UpperCaseDirective,
    IsAuthenticatedDirective
};
