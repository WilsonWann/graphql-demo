const { ApolloServer, gql } = require('apollo-server');

// 1. 加入假資料
const users = [
    {
        id: 1,
        name: 'Fong',
        age: 23
    },
    {
        id: 2,
        name: 'Kevin',
        age: 40
    },
    {
        id: 3,
        name: 'Mary',
        age: 18
    }
];

// The GraphQL schema
// 2. 新增 User type 、在 Query 中新增 me field
const typeDefs = gql`
    """        
    使用者資訊
    """
    type User{
        "識別碼"
        id: ID
        "名字"
        name: String
        "年齡"
        age: Int
    }

    type Query{
        "A simple type for getting started!"
        hello: String
        "取得當下使用者"
        me: User
    }
`;

// A map of functions which return data for the schema.
const resolvers = {
    Query: {
        // 3. 加上 me 的 resolver (一定要在 Query 中喔)
        hello: () => 'world',
        me: () => users[0]
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers
});

server.listen().then(({ url }) => {
    console.log(`? Server ready at ${url}`)
})