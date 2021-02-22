
const { gql } = require('apollo-server')
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

const userSchema = require('./user')
const postSchema = require('./post')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    """
    日期格式。顯示時以 Unix Timestamp in Milliseconds 呈現。
    """
    scalar Date

    type Query {
        "測試用 Hello World"
        hello: String
        # 獲取現在時間
        now: Date
        # 詢問日期是否為週五... TGIF!!
        isFriday(date: Date): Boolean
    }

    type Mutation {
        test: Boolean
    }
`

// Resolvers
const resolvers = {
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        serialize(value) {
            // 輸出到前端
            // 回傳 unix timestamp 值
            return value.getTime();
        },
        parseValue(value) {
            // 從前端 variables 進來的 input
            // 回傳 Date Object 到 Resolver
            return new Date(value);
        },
        parseLiteral(ast) {
            // 從前端 query 字串進來的 input
            // 這邊僅接受輸入進來的是 Int 值
            if (ast.kind === Kind.INT) {
                // 回傳 Date Object 到 Resolver (記得要先 parseInt)
                return new Date(parseInt(ast.value, 10)); // ast value is always in string format
            }
            return null;
        }
    }),
    Query: {
        hello: () => 'world',
        now: () => new Date(),
        isFriday: (root, { date }) => date.getDay() === 5
    },
    Mutation: {
        test: () => 'test'
    }
}

module.exports = {
    typeDefs: [typeDefs, userSchema.typeDefs, postSchema.typeDefs],
    resolvers: [resolvers, userSchema.resolvers, postSchema.resolvers]
};