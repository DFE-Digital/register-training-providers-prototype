module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {})

    await queryInterface.bulkInsert('Users', [
      {
        id: '3faa7586-951b-495c-9999-e5fc4367b507',
        firstName: 'Anne',
        lastName: 'Wilson',
        email: 'anne@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '99c07212-6395-40b5-9776-9210645a5028',
        firstName: 'Mary',
        lastName: 'Lawson',
        email: 'mary@example.com',
        password: 'bat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '354751f2-c5f7-483c-b9e4-b6103f50f970',
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
  }
}
