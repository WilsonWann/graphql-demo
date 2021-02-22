
const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');

const { typeDefs, resolvers, UpperCaseDirective, IsAuthenticatedDirective } = require('./schema')
const { userModel, postModel } = require('./models');

require('dotenv').config();

const SALT_ROUNDS = +process.env.SALT_ROUNDS;
const SECRET = process.env.SECRET;

// 4. Add directive to the ApolloServer constructor
const server = new ApolloServer({
    typeDefs,
    resolvers,
    tracing: true,
    // 4. 將 schema 的 directive 與實作連接並傳進 ApolloServer。
    schemaDirectives: {
        upper: UpperCaseDirective,
        isAuthenticated: IsAuthenticatedDirective
    },
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
                return { ...context, me };
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