function Pagination (pageData, totalCount, pageNumber = 1, pageSize = 50) {
  this.data = pageData            // This is just the “page” chunk
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

// If the database has already done the slicing for us,
// simply return 'this.data' in getData().
Pagination.prototype.getData = function () {
  return this.data
}

// Use totalCount instead of data.length for boundaries
Pagination.prototype.getFirstResultNumber = function () {
  return (this.pageNumber - 1) * this.pageSize + 1
}

Pagination.prototype.getLastResultNumber = function () {
  let lastResultNumber = this.firstResultNumber + this.pageSize - 1
  if (lastResultNumber > this.totalCount) {
    lastResultNumber = this.totalCount
  }
  return lastResultNumber
}

Pagination.prototype.getPageItem = function (itemNumber) {
  return {
    number: itemNumber,
    href: `?page=${itemNumber}&limit=${this.pageSize}`,
    current: parseInt(this.pageNumber) === itemNumber
  }
}

// No change needed to the page items logic,
// as it uses 'this.pageCount', not 'this.data.length'
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

  // Then apply your ellipsis logic as before...
  // (unchanged code from your snippet)
  if (pageItems.length > 7) {
    let startPosition
    let removeCount

    if (currentPageNumber <= threshold) {
      startPosition = threshold + itemsToPad
      removeCount = totalNumberOfPages - itemsToPad - startPosition
      pageItems.splice(startPosition, removeCount, ellipsis)
    } else if (currentPageNumber > (this.pageCount - threshold)) {
      startPosition = 1
      removeCount = totalNumberOfPages - threshold - itemsToPad - itemsToPad
      pageItems.splice(startPosition, removeCount, ellipsis)
    } else {
      // Middle case
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
