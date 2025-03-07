const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    // Already a boolean
    return value
  } else if (typeof value === 'number') {
    // For number inputs: 1 -> true, 0 -> false
    return value === 1
  } else if (typeof value === 'string') {
    // Lowercase for easier comparison
    const lower = value.toLowerCase()
    // Check for 'yes', 'true', or '1'
    return (lower === 'yes' || lower === 'true' || lower === '1')
  } else {
    // In case of unexpected input types
    return false
  }
}

module.exports = {
  toBoolean
}
