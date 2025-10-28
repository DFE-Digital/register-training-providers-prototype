/**
 * Validates an email address format.
 *
 * @param {string} email - The email address to validate.
 * @returns {boolean} `true` if valid email format, `false` otherwise.
 *
 * @example
 * isValidEmail('user@example.com')     // true
 * isValidEmail('invalid.email')        // false
 * isValidEmail('')                     // false
 */
const isValidEmail = (email) => {
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  let valid = true
  if (!email || !regex.test(email)) {
    valid = false
  }
  return valid
}

/**
 * Validates if an email address is from the education.gov.uk domain.
 *
 * @param {string} email - The email address to validate.
 * @returns {boolean} `true` if email contains 'education.gov.uk', `false` otherwise.
 *
 * @example
 * isValidEducationEmail('user@education.gov.uk')     // true
 * isValidEducationEmail('user@example.com')          // false
 */
const isValidEducationEmail = (email) => {
  const regex = /education\.gov\.uk/

  let valid = true
  if (!email || !regex.test(email)) {
    valid = false
  }
  return valid
}

/**
 * Validates a URL format.
 *
 * Accepts URLs with or without protocol (http/https).
 *
 * @param {string} url - The URL to validate.
 * @returns {boolean} `true` if valid URL format, `false` otherwise.
 *
 * @example
 * isValidURL('https://example.com')       // true
 * isValidURL('example.com/path')          // true
 * isValidURL('not a url')                 // false
 */
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

/**
 * Validates a UK telephone number format.
 *
 * Supports various UK formats including landlines, mobile numbers,
 * international format (+44), and optional extensions.
 *
 * @param {string} telephone - The telephone number to validate.
 * @returns {boolean} `true` if valid UK telephone format, `false` otherwise.
 *
 * @example
 * isValidTelephone('020 7946 0958')     // true
 * isValidTelephone('+44 20 7946 0958')  // true
 * isValidTelephone('07700 900123')      // true
 * isValidTelephone('invalid')           // false
 */
const isValidTelephone = (telephone) => {
  const regex = /^(?:(?:\(?(?:0(?:0|11)\)?[\s-]?\(?|\+)44\)?[\s-]?(?:\(?0\)?[\s-]?)?)|(?:\(?0))(?:(?:\d{5}\)?[\s-]?\d{4,5})|(?:\d{4}\)?[\s-]?(?:\d{5}|\d{3}[\s-]?\d{3}))|(?:\d{3}\)?[\s-]?\d{3}[\s-]?\d{3,4})|(?:\d{2}\)?[\s-]?\d{4}[\s-]?\d{4}))(?:[\s-]?(?:x|ext\.?|\#)\d{3,4})?$/
  let valid = true
  if (!telephone || !regex.test(telephone)) {
    valid = false
  }
  return valid
}

/**
 * Validates a provider code format (3 alphanumeric characters).
 *
 * @param {string} code - The provider code to validate.
 * @returns {boolean} `true` if valid 3-character alphanumeric code, `false` otherwise.
 *
 * @example
 * isValidProviderCode('ABC')     // true
 * isValidProviderCode('A1B')     // true
 * isValidProviderCode('ABCD')    // false
 * isValidProviderCode('AB')      // false
 */
const isValidProviderCode = (code) => {
  const regex = /^[a-zA-Z0-9]{3}$/
  let valid = true
  if (!code || !regex.test(code)) {
    valid = false
  }
  return valid
}

/**
 * Validates a Unique Reference Number (URN) format.
 *
 * URNs must be 5 or 6 digits.
 *
 * @param {string} urn - The URN to validate.
 * @returns {boolean} `true` if valid URN (5-6 digits), `false` otherwise.
 *
 * @example
 * isValidURN('12345')      // true
 * isValidURN('123456')     // true
 * isValidURN('1234')       // false
 * isValidURN('1234567')    // false
 */
const isValidURN = (urn) => {
  const regex = /^\d{5,6}$/
  let valid = true
  if (!urn || !regex.test(urn)) {
    valid = false
  }
  return valid
}

/**
 * Validates a UK Provider Reference Number (UKPRN) format.
 *
 * UKPRNs must be 8 digits starting with '1'.
 *
 * @param {string} ukprn - The UKPRN to validate.
 * @returns {boolean} `true` if valid UKPRN (8 digits starting with 1), `false` otherwise.
 *
 * @example
 * isValidUKPRN('10012345')     // true
 * isValidUKPRN('12345678')     // true
 * isValidUKPRN('20012345')     // false (doesn't start with 1)
 * isValidUKPRN('1234567')      // false (too short)
 */
const isValidUKPRN = (ukprn) => {
  const regex = /^1\d{7}$/
  let valid = true
  if (!ukprn || !regex.test(ukprn)) {
    valid = false
  }
  return valid
}

/**
 * Validates an accredited provider ID based on its format and optional provider type.
 *
 * By default, the ID must be a 4-digit string starting with either `1` or `5`.
 * If a `providerType` is specified:
 * - `'hei'` (Higher Education Institution) must start with `1`
 * - `'scitt'` (School-Centred Initial Teacher Training) must start with `5`
 *
 * @param {string} accreditedProviderId - The provider ID to validate.
 * @param {string|null} [providerType=null] - Optional type of provider ('hei' or 'scitt').
 *
 * @returns {boolean} `true` if the ID is valid for the given type, otherwise `false`.
 */
const isValidAccreditedProviderNumber = (accreditedProviderNumber, providerType = null) => {
  // ^ matches the start of the string
  // [15] matches either the character 1 or 5
  // \d matches any digit (equivalent to [0-9])
  // {3} quantifier matches the preceding \d exactly 3 times
  // $ matches the end of the string
  let regex = /^[15]\d{3}$/

  if (providerType === 'hei') {
    // if HEI, accredited provider IDs start with a 1
    regex = /^1\d{3}$/
  } else {
    // if SCITT, accredited provider IDs start with a 5
    regex = /^5\d{3}$/
  }

  let valid = true

  if (!accreditedProviderNumber || !regex.test(accreditedProviderNumber)) {
    valid = false
  }

  return valid
}

/**
 * Validates that text does not exceed a specified word count.
 *
 * Normalizes whitespace and newlines before counting words.
 *
 * @param {string} text - The text to validate.
 * @param {number} wordCount - Maximum allowed word count.
 * @returns {boolean} `true` if text is within word limit, `false` if it exceeds.
 *
 * @example
 * isValidWordCount('Hello world', 5)           // true
 * isValidWordCount('Hello world', 1)           // false
 * isValidWordCount('One two three', 3)         // true
 * isValidWordCount('One two three four', 3)    // false
 */
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

/**
 * Validates a Teacher Reference Number (TRN) format.
 *
 * TRNs must be exactly 7 digits.
 *
 * @param {string} trn - The TRN to validate.
 * @returns {boolean} `true` if valid TRN (7 digits), `false` otherwise.
 *
 * @example
 * isValidTRN('1234567')     // true
 * isValidTRN('123456')      // false
 * isValidTRN('12345678')    // false
 * isValidTRN('ABC1234')     // false
 */
const isValidTRN = (trn) => {
  const regex = /^\d{7}$/
  let valid = true
  if (!trn || !regex.test(trn)) {
    valid = false
  }
  return valid
}

module.exports = {
  isValidAccreditedProviderNumber,
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
