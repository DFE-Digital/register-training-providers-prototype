const nullIfEmpty = (value) => {
  // If it's null or undefined outright
  if (value == null) return null;

  // If it's a number, decide what "empty" means
  if (typeof value === 'number') {
    // Example: treat NaN as empty, but allow 0, -1, etc.
    return Number.isNaN(value) ? null : value;
  }

  // Otherwise, handle it as a string (or something convertible to string)
  // Trim whitespace and check length
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? value : null;
}

module.exports = {
  nullIfEmpty
}
