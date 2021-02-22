
const { gql } = require('apollo-server')
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { DateTime, resolvers } = require('graphql-scalars');

const userSchema = require('./user')
const postSchema = require('./post')

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
    """
    日期格式。顯示時以 Unix Timestamp in Milliseconds 呈現。
    """
    scalar Date

    scalar DateTime
    
    type Query {
        # 獲取現在時間
        now: DateTime
        # 詢問日期是否為週五... TGIF!!
        isFriday(date: DateTime): Boolean
    }

    type Mutation {
        test: Boolean
    }
`

// Resolvers
const myResolvers = {
    DateTime: resolvers.DateTime,
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
        now: () => new Date(),
        isFriday: (root, { date }) => date.getDay() === 5
    },
    Mutation: {
        test: () => 'test'
    }
}

module.exports = {
    typeDefs: [typeDefs, userSchema.typeDefs, postSchema.typeDefs],
    resolvers: [myResolvers, userSchema.resolvers, postSchema.resolvers],
    UpperCaseDirective: userSchema.UpperCaseDirective,
    IsAuthenticatedDirective: userSchema.IsAuthenticatedDirective,
};