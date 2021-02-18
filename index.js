
const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');

const { typeDefs, resolvers } = require('./schema')
const { userModel, postModel } = require('./models');

require('dotnet').config();

const SALT_ROUNDS = +process.env.SALT_ROUNDS;
const SECRET = process.env.SECRET;

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