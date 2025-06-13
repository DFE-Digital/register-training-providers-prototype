const isValidEmail = (email) => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  let valid = true
  if (!email || !regex.test(email)) {
    valid = false
  }
  return valid
}

const isValidEducationEmail = (email) => {
  const regex = /education\.gov\.uk/

  let valid = true
  if (!email || !regex.test(email)) {
    valid = false
  }
  return valid
}

const isValidURL = (url) => {
  const regex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/igm
  let valid = true
  if (!url || !regex.test(url)) {
    valid = false
  }
  return valid
}

/**
 * Validates a UK postcode against the standard full postcode format.
 *
 * This function checks for a full UK postcode, including special cases
 * like 'GIR 0AA'. It allows for an optional space between the outward and
 * inward parts of the postcode, and ignores case and leading/trailing whitespace.
 *
 * @param {string} postcode - The postcode to validate.
 * @returns {boolean} Returns `true` if the postcode is a valid full UK postcode, otherwise `false`.
 *
 * @example
 * isValidPostcode('EC1A 1BB') // true
 * isValidPostcode('W1A0AX')   // true
 * isValidPostcode('SW1')      // false
 */
const isValidPostcode = (postcode) => {
  const regex = /^((GIR 0AA)|((([A-Z]{1,2}[0-9][0-9A-Z]?)|([A-Z]{1,2}[0-9]{1,2})) ?[0-9][A-Z]{2}))$/i
  return !!postcode && regex.test(postcode.trim().toUpperCase())
}

const isValidTelephone = (telephone) => {
  const regex = /^(?:(?:\(?(?:0(?:0|11)\)?[\s-]?\(?|\+)44\)?[\s-]?(?:\(?0\)?[\s-]?)?)|(?:\(?0))(?:(?:\d{5}\)?[\s-]?\d{4,5})|(?:\d{4}\)?[\s-]?(?:\d{5}|\d{3}[\s-]?\d{3}))|(?:\d{3}\)?[\s-]?\d{3}[\s-]?\d{3,4})|(?:\d{2}\)?[\s-]?\d{4}[\s-]?\d{4}))(?:[\s-]?(?:x|ext\.?|\#)\d{3,4})?$/
  let valid = true
  if (!telephone || !regex.test(telephone)) {
    valid = false
  }
  return valid
}

const isValidProviderCode = (code) => {
  const regex = /^[a-zA-Z0-9]{3}$/
  let valid = true
  if (!code || !regex.test(code)) {
    valid = false
  }
  return valid
}

const isValidURN = (urn) => {
  // ^ matches the start of the string
  // \d matches any digit (equivalent to [0-9])
  // {5,6} quantifier matches the preceding \d between 5 and 6 times, inclusive
  // $ matches the end of the string
  const regex = /^\d{5,6}$/
  let valid = true
  if (!urn || !regex.test(urn)) {
    valid = false
  }
  return valid
}

const isValidUKPRN = (ukprn) => {
  // ^ matches the start of the string
  // 1 matches the literal character 1
  // \d matches any digit (equivalent to [0-9])
  // {7} quantifier matches the preceding \d exactly 7 times
  // $ matches the end of the string
  const regex = /^1\d{7}$/
  let valid = true
  if (!ukprn || !regex.test(ukprn)) {
    valid = false
  }
  return valid
}

const isValidAccreditedProviderId = (accreditedProviderId, providerType = null) => {
  // ^ matches the start of the string
  // [15] matches either the character 1 or 5
  // \d matches any digit (equivalent to [0-9])
  // {3} quantifier matches the preceding \d exactly 3 times
  // $ matches the end of the string
  let regex = /^[15]\d{3}$/

  if (providerType === 'hei') {
    // if HEI, accredited provider IDs start with a 1
    regex = /^1\d{3}$/
  } else if (providerType === 'scitt') {
    // if SCITT, accredited provider IDs start with a 5
    regex = /^5\d{3}$/
  }

  let valid = true

  if (!accreditedProviderId || !regex.test(accreditedProviderId)) {
    valid = false
  }

  return valid
}

const isValidWordCount = (text, wordCount) => {
  // 1. Remove start/end whitespace and new lines, and replace with a space
  // 2. Replace two or more spaces with a single space
  const string = text.replace(/^\s+|\s+$|\n/g, ' ').replace(/\s{2,}/g, ' ')

  let valid = true

  if (string.split(' ').length > wordCount) {
    valid = false
  }

  return valid
}

const isValidTRN = (trn) => {
  // ^ matches the start of the string
  // \d matches any digit (equivalent to [0-9])
  // {7} quantifier matches the preceding \d exactly 7 times
  // $ matches the end of the string
  const regex = /^\d{7}$/
  let valid = true
  if (!trn || !regex.test(trn)) {
    valid = false
  }
  return valid
}

module.exports = {
  isValidAccreditedProviderId,
  isValidEducationEmail,
  isValidEmail,
  isValidPostcode,
  isValidProviderCode,
  isValidTRN,
  isValidTelephone,
  isValidUKPRN,
  isValidURL,
  isValidURN,
  isValidWordCount
}
