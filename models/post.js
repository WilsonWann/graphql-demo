const posts = [
    {
        id: 1,
        authorId: 1,
        title: 'Hello World',
        body: 'This is my first post',
        likeGiverIds: [1, 2],
        createdAt: '2018-10-22T01:40:14.941Z'
    },
    {
        id: 2,
        authorId: 2,
        title: 'Nice Day',
        body: 'Hello My Friend!',
        likeGiverIds: [1],
        createdAt: '2018-10-24T01:40:14.941Z'
    }
];

const getAllPosts = () => posts;

const findPostByPostId = postId => posts.find(post => post.id === +postId);

const filterPostsByUserId = userId => posts.filter(post => userId === post.authorId);

const addPost = ({ authorId, title, body }) =>
(posts[posts.length] = {
    id: posts[posts.length - 1].id + 1,
    authorId,
    title,
    body,
    likeGiverIds: [],
    createdAt: new Date().toISOString()
});

const updatePost = (postId, data) => Object.assign(findPostByPostId(postId), data);

const deletePost = (postId) => posts.splice(posts.findIndex(post => post.id === postId), 1)[0];

module.exports = {
    getAllPosts,
    filterPostsByUserId,
    addPost,
    updatePost,
    deletePost,
}