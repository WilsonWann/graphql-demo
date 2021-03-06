const users = [
    {
        id: 1,
        email: 'fong@test.com',
        password: '$2b$04$wcwaquqi5ea1Ho0aKwkZ0e51/RUkg6SGxaumo8fxzILDmcrv4OBIO', // 123456
        name: 'Fong',
        age: 23,
        friendIds: [2, 3],
        height: 175,
        weight: 60
    },
    {
        id: 2,
        email: 'kevin@test.com',
        passwrod: '$2b$04$uy73IdY9HVZrIENuLwZ3k./0azDvlChLyY1ht/73N4YfEZntgChbe', // 123456
        name: 'Kevin',
        age: 40,
        friendIds: [1],
        height: 160,
        weight: 40
    },
    {
        id: 3,
        email: 'mary@test.com',
        password: '$2b$04$UmERaT7uP4hRqmlheiRHbOwGEhskNw05GHYucU73JRf8LgWaqWpTy', // 123456
        name: 'Mary',
        age: 18,
        friendIds: [1],
        height: 185,
        weight: 100
    }
];

const getAllUsers = () => users;

const findUserByUserId = userId => users.find(user => user.id === +userId);

const filterUsersByUserIds = userIds => users.filter(user => userIds.includes(user.id));

const findUserByName = name => users.find(user => user.name === name);

const updateUserInfo = (userId, data) => Object.assign(findUserByUserId(userId), data);

const addUser = ({ name, email, password }) => (
    users[users.length] = {
        id: users[users.length - 1].id + 1,
        name,
        email,
        password
    }
);

module.exports = {
    getAllUsers,
    filterUsersByUserIds,
    findUserByName,
    updateUserInfo,
    addUser,
}