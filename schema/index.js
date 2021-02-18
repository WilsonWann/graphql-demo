
const { gql } = require('apollo-server')

const userSchema = require('./user')
const postSchema = require('./post')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    type Query {
        "測試用 Hello World"
        hello: String
    }

    type Mutation {
        test: Boolean
    }
`

// Resolvers
const resolvers = {
    Query: {
        hello: () => 'world'
    },
    Mutation: {
        test: () => 'test'
    }
}

module.exports = {
    typeDefs: [typeDefs, userSchema.typeDefs, postSchema.typeDefs],
    resolvers: [resolvers, userSchema.resolvers, postSchema.resolvers]
};