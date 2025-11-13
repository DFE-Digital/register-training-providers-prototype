const { Op } = require('sequelize')
const { AcademicYear } = require('../models')

/**
 * Get details for a list of academicYear IDs.
 * @param {Array<string>} academicYearIds - Array of academicYear UUIDs
 * @returns {Promise<Array<Object>>} Array of AcademicYear objects
 */
const getAcademicYearDetails = async (academicYearIds) => {
  if (!Array.isArray(academicYearIds) || academicYearIds.length === 0) {
    return []
  }

  const academicYears = await AcademicYear.findAll({
    where: {
      id: {
        [Op.in]: academicYearIds
      }
    }
  })

  return academicYears.map(academicYear => academicYear.toJSON())
}

module.exports = {
  getAcademicYearDetails
}
