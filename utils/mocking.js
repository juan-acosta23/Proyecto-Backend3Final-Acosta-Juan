const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

class MockingService {
    /**
     * @returns {Object}
     */
    generatePet() {
        const species = ['dog', 'cat', 'bird', 'hamster', 'rabbit', 'fish', 'turtle'];
        const randomSpecies = species[Math.floor(Math.random() * species.length)];
        
        return {
            name: faker.person.firstName(),
            species: randomSpecies,
            birthDate: faker.date.past({ years: 10 }),
            adopted: false,
            owner: null,
            image: faker.image.url()
        };
    }

    /**
     * @param {Number} count 
     * @returns {Array} 
     */
    generatePets(count = 50) {
        const pets = [];
        for (let i = 0; i < count; i++) {
            pets.push(this.generatePet());
        }
        return pets;
    }

    /**
     * @returns {Object} 
     */
    generateUser() {
        const roles = ['user', 'admin'];
        const randomRole = roles[Math.floor(Math.random() * roles.length)];
        
        const hashedPassword = bcrypt.hashSync('coder123', 10);
        
        return {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            email: faker.internet.email(),
            age: faker.number.int({ min: 18, max: 80 }),
            password: hashedPassword,
            role: randomRole,
            pets: [] 
        };
    }

    /**
     * @param {Number} count 
     * @returns {Array} 
     */
    generateUsers(count = 50) {
        const users = [];
        for (let i = 0; i < count; i++) {
            users.push(this.generateUser());
        }
        return users;
    }

    /**
     * @param {Number} usersCount 
     * @param {Number} petsCount 
     * @returns {Object} 
     */
    generateData(usersCount = 0, petsCount = 0) {
        return {
            users: this.generateUsers(usersCount),
            pets: this.generatePets(petsCount)
        };
    }
}

module.exports = new MockingService();