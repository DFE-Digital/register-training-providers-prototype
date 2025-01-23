'use strict';

const { v4: uuid } = require('uuid')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Users', [
      {
        id: uuid(),
        firstname: 'Anne',
        lastname: 'Wilson',
        email: 'anne@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        firstname: 'Mary',
        lastname: 'Lawson',
        email: 'mary@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: uuid(),
        firstname: 'Colin',
        lastname: 'Chapman',
        email: 'colin.chapman@education.gov.uk',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {})
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  },
};
