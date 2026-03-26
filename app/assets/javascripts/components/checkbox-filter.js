export const CheckboxFilter = class {
  constructor (options) {
    this.options = options
    this.container = options.container instanceof HTMLElement
      ? options.container
      : document.querySelector(options.container)

    if (!this.container) return

    this.container.classList.add('app-checkbox-filter--enhanced')
    this.checkboxes = this.container.querySelectorAll("input[type='checkbox']")
    this.checkboxesContainer = this.container.querySelector('.app-checkbox-filter__container')
    this.checkboxesInnerContainer = this.checkboxesContainer
      ? this.checkboxesContainer.querySelector('.app-checkbox-filter__container-inner')
      : null
    this.legend = this.container.querySelector('legend')
    if (this.legend) {
      this.legend.classList.add('govuk-visually-hidden')
    }
  }

  setupHeading () {
    if (!this.legend) return

    this.heading = document.createElement('p')
    this.heading.className = 'app-checkbox-filter__title'
    this.heading.setAttribute('aria-hidden', 'true')
    this.heading.textContent = this.legend.textContent
    this.container.prepend(this.heading)
  }

  setupTextBox () {
    var tagContainer = this.container.querySelector('.app-checkbox-filter__selected')
    if (tagContainer) {
      tagContainer.insertAdjacentHTML('afterend', this.getTextBoxHtml())
    } else if (this.heading) {
      this.heading.insertAdjacentHTML('afterend', this.getTextBoxHtml())
    } else {
      this.container.insertAdjacentHTML('afterbegin', this.getTextBoxHtml())
    }

    this.textBox = this.container.querySelector('.app-checkbox-filter__filter-input')
    if (this.textBox) {
      this.textBox.addEventListener('keyup', this.onTextBoxKeyUp.bind(this))
    }
  }

  getTextBoxHtml () {
    var id = this.container.id
    var html = ''
    html += '<label for="' + id + '-checkbox-filter__filter-input" class="govuk-label govuk-visually-hidden">' + this.options.textBox.label + '</label>'
    html += '<input id="' + id + '-checkbox-filter__filter-input" class="app-checkbox-filter__filter-input govuk-input" type="text" aria-describedby="' + id + '-checkboxes-status" aria-controls="' + id + '-checkboxes" autocomplete="off" spellcheck="false">'
    return html
  }

  setupStatusBox () {
    this.statusBox = document.createElement('div')
    this.statusBox.className = 'govuk-visually-hidden'
    this.statusBox.setAttribute('role', 'status')
    this.statusBox.id = this.container.id + '-checkboxes-status'
    this.updateStatusBox({
      foundCount: this.getAllVisibleCheckboxes().length,
      checkedCount: this.getAllVisibleCheckedCheckboxes().length
    })
    this.container.append(this.statusBox)
  }

  updateStatusBox (params) {
    var status = '%found% options found, %selected% selected'
    status = status.replace(/%found%/, params.foundCount)
    status = status.replace(/%selected%/, params.checkedCount)
    this.statusBox.textContent = status
  }

  onTextBoxKeyUp (e) {
    var ENTER_KEY = 13
    if (e.keyCode === ENTER_KEY) {
      e.preventDefault()
    } else {
      this.filterCheckboxes()
    }
  }

  cleanString (text) {
    text = text.replace(/&/g, 'and')
    text = text.replace(/[’',:–-]/g, '') // remove punctuation characters
    text = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special characters
    return text.trim().replace(/\s\s+/g, ' ').toLowerCase() // replace multiple spaces with one
  }

  filterCheckboxes () {
    var textValue = this.cleanString(this.textBox.value)

    var allCheckboxes = this.getAllCheckboxes()
    // hide all checkboxes
    allCheckboxes.forEach((checkbox) => {
      checkbox.style.display = 'none'
    })

    for (var i = 0; i < allCheckboxes.length; i++) {
      var label = allCheckboxes[i].querySelector('.govuk-checkboxes__label')
      var labelValue = this.cleanString(label ? label.textContent : '')
      if (labelValue.search(textValue) !== -1) {
        allCheckboxes[i].style.display = ''
      }
    }

    this.updateStatusBox({
      foundCount: this.getAllVisibleCheckboxes().length,
      checkedCount: this.getAllVisibleCheckedCheckboxes().length
    })
  }

  getAllCheckboxes () {
    if (!this.checkboxesContainer) return []
    return Array.from(this.checkboxesContainer.querySelectorAll('.govuk-checkboxes__item'))
  }

  getAllVisibleCheckboxes () {
    return this.getAllCheckboxes().filter(function (el) {
      return window.getComputedStyle(el).display !== 'none'
    })
  }

  getAllVisibleCheckedCheckboxes () {
    return this.getAllVisibleCheckboxes().filter(function (el) {
      var input = el.querySelector('.govuk-checkboxes__input')
      return input ? input.checked : false
    })
  }

  setContainerHeight (height) {
    if (!this.checkboxesContainer) return
    this.checkboxesContainer.style.height = typeof height === 'number' ? height + 'px' : height
  }

  isCheckboxInView (index, option) {
    var checkbox = option
    var initialOptionContainerHeight = this.checkboxesContainer.offsetHeight
    var optionListOffsetTop = this.checkboxesInnerContainer.getBoundingClientRect().top
    var distanceFromTopOfContainer = checkbox.getBoundingClientRect().top - optionListOffsetTop
    return distanceFromTopOfContainer < initialOptionContainerHeight
  }

  getVisibleCheckboxes () {
    var visibleCheckboxes = Array.from(this.checkboxes).filter(this.isCheckboxInView.bind(this))
    // add an extra checkbox, if the label of the first is too long it collapses onto itself
    if (this.checkboxes[visibleCheckboxes.length]) {
      visibleCheckboxes.push(this.checkboxes[visibleCheckboxes.length])
    }
    return visibleCheckboxes
  }

  setupHeight () {
    var initialOptionContainerHeight = this.checkboxesContainer.offsetHeight
    var height = this.outerHeightWithMargin(this.checkboxesInnerContainer)

    // check whether this is hidden by progressive disclosure,
    // because height calculations won't work
    if (this.checkboxesContainer.offsetParent === null) {
      initialOptionContainerHeight = 200
      height = 200
    }

    // Resize if the list is only slightly bigger than its container
    if (height < initialOptionContainerHeight + 50) {
      this.setContainerHeight(height + 1)
      return
    }

    // Resize to cut last item cleanly in half
    var lastVisibleCheckbox = this.getVisibleCheckboxes().slice(-1)[0]
    if (!lastVisibleCheckbox) return
    var position = lastVisibleCheckbox.parentElement.offsetTop // parent element is relative
    this.setContainerHeight(position + (lastVisibleCheckbox.offsetHeight / 1.5))
  }

  init () {
    if (!this.container || !this.checkboxesContainer || !this.checkboxesInnerContainer) return
    this.setupStatusBox()
    this.setupHeading()
    this.setupTextBox()
    this.setupHeight()
  }

  outerHeightWithMargin (element) {
    if (!element) return 0
    var rect = element.getBoundingClientRect()
    var style = window.getComputedStyle(element)
    var marginTop = parseFloat(style.marginTop) || 0
    var marginBottom = parseFloat(style.marginBottom) || 0
    return rect.height + marginTop + marginBottom
  }
}
