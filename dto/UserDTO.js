class UserDTO {
    constructor(user) {
        this.id = user._id;
        this.first_name = user.first_name;
        this.last_name = user.last_name;
        this.email = user.email;
        this.age = user.age;
        this.role = user.role;
        this.cart = user.cart;
        if (user.lastLogin) {
            this.lastLogin = user.lastLogin;
        }

        this.fullName = `${user.first_name} ${user.last_name}`;
    }

    static minimal(user) {
        return {
            id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role
        };
    }

    static fromUser(user) {
        return new UserDTO(user);
    }

    static fromUsers(users) {
        return users.map(user => new UserDTO(user));
    }

    static public(user) {
        return {
            id: user._id,
            fullName: `${user.first_name} ${user.last_name}`,
            role: user.role
        };
    }

    static forAdmin(user) {
        return {
            id: user._id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            age: user.age,
            role: user.role,
            cart: user.cart,
            lastLogin: user.lastLogin,
            isLocked: user.isLocked || false,
            loginAttempts: user.loginAttempts || 0,
            createdAt: user.createdAt
        };
    }
}

module.exports = UserDTO;