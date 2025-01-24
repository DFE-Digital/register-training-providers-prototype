'use strict';

const { v4: uuid } = require('uuid')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {})

    await queryInterface.bulkInsert('Users', [
      {
        id: uuid(),
        firstName: 'Anne',
        lastName: 'Wilson',
        email: 'anne@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        firstName: 'Mary',
        lastName: 'Lawson',
        email: 'mary@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        firstName: 'Colin',
        lastName: 'Chapman',
        email: 'colin.chapman@education.gov.uk',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {})
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {})
  },
};
