/**
 * Pagination helper for generating pagination data and navigation items.
 *
 * Handles server-side pagination where the database has already sliced the data.
 * Generates pagination metadata including page numbers, result ranges, and
 * navigation links with ellipsis for long page lists.
 *
 * @constructor
 * @param {Array} pageData - The current page's data (already sliced by database query).
 * @param {number} totalCount - The total number of items across all pages.
 * @param {number} [pageNumber=1] - The current page number (1-indexed).
 * @param {number} [pageSize=50] - The number of items per page.
 *
 * @property {Array} data - The current page's data.
 * @property {number} totalCount - Total number of items across all pages.
 * @property {number} pageNumber - Current page number.
 * @property {number} pageSize - Number of items per page.
 * @property {number} pageCount - Total number of pages.
 * @property {Object} [previousPage] - Previous page navigation item (undefined if on first page).
 * @property {Object} [nextPage] - Next page navigation item (undefined if on last page).
 * @property {number} firstResultNumber - First result number on current page (e.g., 51 for page 2).
 * @property {number} lastResultNumber - Last result number on current page (e.g., 100 for page 2).
 * @property {Array<Object>} pageItems - Array of page navigation items with ellipsis.
 *
 * @example
 * const pagination = new Pagination(providers, 250, 2, 25)
 * console.log(pagination.pageNumber)        // 2
 * console.log(pagination.firstResultNumber) // 26
 * console.log(pagination.lastResultNumber)  // 50
 * console.log(pagination.pageItems)         // [{ number: 1, href: '?page=1&limit=25' }, ...]
 */
function Pagination (pageData, totalCount, pageNumber = 1, pageSize = 50) {
  this.data = pageData            // This is just the "page" chunk
  this.totalCount = totalCount    // This is the overall number of items
  this.pageNumber = parseInt(pageNumber, 10)
  this.pageSize = parseInt(pageSize, 10)

  // Calculate overall page count based on totalCount
  this.pageCount = Math.ceil(this.totalCount / this.pageSize)

  // Compute previous & next
  if (this.pageNumber > 1) {
    this.previousPage = this.getPageItem(this.pageNumber - 1)
  }
  if (this.pageNumber < this.pageCount) {
    this.nextPage = this.getPageItem(this.pageNumber + 1)
  }

  this.firstResultNumber = this.getFirstResultNumber()
  this.lastResultNumber = this.getLastResultNumber()
  this.pageItems = this.getPageItems()  // For the pagination links/ellipsis
}

/**
 * Returns the current page's data.
 *
 * @returns {Array} The data for the current page (already sliced by database).
 */
Pagination.prototype.getData = function () {
  return this.data
}

/**
 * Calculates the first result number for the current page.
 *
 * @returns {number} The first result number (1-indexed). E.g., 51 for page 2 with 50 items/page.
 */
Pagination.prototype.getFirstResultNumber = function () {
  return (this.pageNumber - 1) * this.pageSize + 1
}

/**
 * Calculates the last result number for the current page.
 *
 * @returns {number} The last result number. Will not exceed totalCount.
 */
Pagination.prototype.getLastResultNumber = function () {
  let lastResultNumber = this.firstResultNumber + this.pageSize - 1
  if (lastResultNumber > this.totalCount) {
    lastResultNumber = this.totalCount
  }
  return lastResultNumber
}

/**
 * Creates a page navigation item object.
 *
 * @param {number} itemNumber - The page number for this item.
 * @returns {Object} Page item with number, href, and current flag.
 * @returns {number} return.number - The page number.
 * @returns {string} return.href - URL with page and limit query parameters.
 * @returns {boolean} return.current - True if this is the current page.
 */
Pagination.prototype.getPageItem = function (itemNumber) {
  return {
    number: itemNumber,
    href: `?page=${itemNumber}&limit=${this.pageSize}`,
    current: parseInt(this.pageNumber) === itemNumber
  }
}

/**
 * Generates pagination navigation items with ellipsis for long lists.
 *
 * For lists with more than 7 pages, inserts ellipsis objects to shorten
 * the navigation. Shows pages near the start, current page, and end.
 *
 * @returns {Array<Object>} Array of page items and ellipsis markers.
 * @returns {Array<Object>} Page items have { number, href, current }.
 * @returns {Array<Object>} Ellipsis markers have { ellipsis: true }.
 *
 * @example
 * // Page 1 of 20: [1] 2 3 4 5 ... 20
 * // Page 10 of 20: 1 ... 9 [10] 11 ... 20
 * // Page 20 of 20: 1 ... 16 17 18 19 [20]
 */
Pagination.prototype.getPageItems = function () {
  const threshold = 4
  const itemsToPad = 1
  const currentPageNumber = this.pageNumber
  const totalNumberOfPages = this.pageCount
  const ellipsis = { ellipsis: true }
  const pageItems = []

  // Build an array of page items: 1..n
  for (let i = 1; i <= totalNumberOfPages; i++) {
    pageItems.push(this.getPageItem(i))
  }

  // Apply ellipsis logic for long page lists (>7 pages)
  if (pageItems.length > 7) {
    let startPosition
    let removeCount

    if (currentPageNumber <= threshold) {
      // Near start: show first 5 pages, ellipsis, last page
      startPosition = threshold + itemsToPad
      removeCount = totalNumberOfPages - itemsToPad - startPosition
      pageItems.splice(startPosition, removeCount, ellipsis)
    } else if (currentPageNumber > (this.pageCount - threshold)) {
      // Near end: show first page, ellipsis, last 5 pages
      startPosition = 1
      removeCount = totalNumberOfPages - threshold - itemsToPad - itemsToPad
      pageItems.splice(startPosition, removeCount, ellipsis)
    } else {
      // Middle: show first, ellipsis, current ±1, ellipsis, last
      startPosition = currentPageNumber + itemsToPad
      removeCount = totalNumberOfPages - startPosition - itemsToPad
      pageItems.splice(startPosition, removeCount, ellipsis)

      startPosition = 1
      removeCount = currentPageNumber - itemsToPad - itemsToPad - 1
      pageItems.splice(startPosition, removeCount, ellipsis)
    }
  }

  return pageItems
}

module.exports = Pagination
