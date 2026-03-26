export class CheckboxFilter {
  constructor (options) {
    this.options = options
    this.container = options.container
    this.container.classList.add('app-checkbox-filter--enhanced')

    this.checkboxes = Array.from(this.container.querySelectorAll("input[type='checkbox']"))
    this.checkboxesContainer = this.container.querySelector('.app-checkbox-filter__container')
    this.checkboxesInnerContainer = this.checkboxesContainer.querySelector('.app-checkbox-filter__container-inner')
    this.legend = this.container.querySelector('legend')
    if (this.legend) this.legend.classList.add('govuk-visually-hidden')
  }

  setupHeading () {
    this.heading = document.createElement('p')
    this.heading.className = 'app-checkbox-filter__title'
    this.heading.setAttribute('aria-hidden', 'true')

    if (this.legend) {
      // Get the inner HTML of the legend (includes visually hidden spans)
      const legendHtml = this.legend.innerHTML.trim()
      // Insert the same HTML into the new heading
      this.heading.innerHTML = legendHtml
    }

    this.container.prepend(this.heading)
  }

  setupTextBox () {
    const tagContainer = this.container.querySelector('.app-checkbox-filter__selected')
    const html = this.getTextBoxHtml()
    if (tagContainer) {
      tagContainer.insertAdjacentHTML('afterend', html)
    } else if (this.heading) {
      this.heading.insertAdjacentHTML('afterend', html)
    } else {
      this.container.insertAdjacentHTML('afterbegin', html)
    }

    this.textBox = this.container.querySelector('.app-checkbox-filter__filter-input')
    this.textBox.addEventListener('keydown', (e) => this.onTextBoxKeyDown(e))
  }

  getTextBoxHtml () {
    const id = this.container.id
    return `
      <label for="${id}-checkbox-filter__filter-input" class="govuk-label govuk-visually-hidden">${this.options.textBox.label}</label>
      <input id="${id}-checkbox-filter__filter-input" class="app-checkbox-filter__filter-input govuk-input" type="text"
        aria-describedby="${id}-checkboxes-status"
        aria-controls="${id}-checkboxes"
        autocomplete="off"
        spellcheck="false">
    `
  }

  setupStatusBox () {
    this.statusBox = document.createElement('div')
    this.statusBox.className = 'govuk-visually-hidden'
    this.statusBox.setAttribute('role', 'status')
    this.statusBox.id = `${this.container.id}-checkboxes-status`
    this.updateStatusBox({
      foundCount: this.getAllVisibleCheckboxes().length,
      checkedCount: this.getAllVisibleCheckedCheckboxes().length
    })
    this.container.appendChild(this.statusBox)
  }

  updateStatusBox (params) {
    let status = '%found% options found, %selected% selected'
    status = status.replace(/%found%/, params.foundCount)
    status = status.replace(/%selected%/, params.checkedCount)
    this.statusBox.textContent = status
  }

  onTextBoxKeyDown (e) {
    const ENTER_KEY = 13
    if (e.keyCode === ENTER_KEY) {
      e.preventDefault()
    } else {
      this.filterCheckboxes()
    }
  }

  cleanString (text) {
    text = text.replace(/&/g, 'and')
    text = text.replace(/[’',:–-]/g, '')
    text = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.trim().replace(/\s\s+/g, ' ').toLowerCase()
  }

  filterCheckboxes () {
    const textValue = this.cleanString(this.textBox.value)
    const allCheckboxes = this.getAllCheckboxItems()

    allCheckboxes.forEach(item => {
      const label = item.querySelector('.govuk-checkboxes__label')
      const labelValue = this.cleanString(label.textContent)
      if (labelValue.includes(textValue)) {
        item.style.display = ''
      } else {
        item.style.display = 'none'
      }
    })

    this.updateStatusBox({
      foundCount: this.getAllVisibleCheckboxes().length,
      checkedCount: this.getAllVisibleCheckedCheckboxes().length
    })
  }

  getAllCheckboxItems () {
    return Array.from(this.checkboxesContainer.querySelectorAll('.govuk-checkboxes__item'))
  }

  getAllVisibleCheckboxes () {
    return this.getAllCheckboxItems().filter(item => {
      return window.getComputedStyle(item).display !== 'none'
    })
  }

  getAllVisibleCheckedCheckboxes () {
    return this.getAllVisibleCheckboxes().filter(item => {
      const input = item.querySelector('.govuk-checkboxes__input')
      return input && input.checked
    })
  }

  setContainerHeight (height) {
    this.checkboxesContainer.style.height = `${height}px`
  }

  isCheckboxInView (option) {
    const initialOptionContainerHeight = this.checkboxesContainer.offsetHeight
    const optionListOffsetTop = this.checkboxesInnerContainer.getBoundingClientRect().top
    const distanceFromTopOfContainer = option.getBoundingClientRect().top - optionListOffsetTop
    return distanceFromTopOfContainer < initialOptionContainerHeight
  }

  getVisibleCheckboxes () {
    let visibleCheckboxes = this.checkboxes.filter(input => {
      return this.isCheckboxInView(input)
    })
    if (visibleCheckboxes.length < this.checkboxes.length) {
      visibleCheckboxes.push(this.checkboxes[visibleCheckboxes.length])
    }
    return visibleCheckboxes
  }

  setupHeight () {
    let initialOptionContainerHeight = this.checkboxesContainer.offsetHeight
    let height = this.checkboxesInnerContainer.offsetHeight

    if (!this.checkboxesContainer.offsetParent) {
      initialOptionContainerHeight = 200
      height = 200
    }

    if (height < initialOptionContainerHeight + 50) {
      this.setContainerHeight(height + 1)
      return
    }

    const visible = this.getVisibleCheckboxes()
    if (visible.length) {
      const lastVisibleCheckbox = visible[visible.length - 1]
      const position = lastVisibleCheckbox.parentElement.offsetTop
      this.setContainerHeight(position + (lastVisibleCheckbox.offsetHeight / 1.5))
    }
  }

  init () {
    this.setupStatusBox()
    this.setupHeading()
    this.setupTextBox()
    this.setupHeight()
  }
}
