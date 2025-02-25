export class FilterToggleButton {
  constructor(options) {
    this.options = options
    this.mq = window.matchMedia(this.options.bigModeMediaQuery)
    this.container = this.options.toggleButton.container
  }

  setupResponsiveChecks() {
    // Preferred modern usage
    this.mq.addEventListener('change', this.checkMode.bind(this))
    // Make an initial check
    this.checkMode(this.mq)
  }

  checkMode(mq) {
    if (mq.matches) {
      this.enableBigMode()
    } else {
      this.enableSmallMode()
    }
  }

  enableBigMode() {
    this.showMenu()
    this.removeMenuButton()
    this.removeCloseButton()
  }

  enableSmallMode() {
    this.options.filter.container.setAttribute('tabindex', '-1')
    this.hideMenu()
    this.addMenuButton()
    this.addCloseButton()
  }

  addCloseButton() {
    if (this.options.closeButton) {
      this.closeButton = document.createElement('button')
      this.closeButton.type = 'button'
      this.closeButton.classList.add('app-filter__close')
      this.closeButton.textContent = this.options.closeButton.text

      // optionally add hidden text
      const hiddenSpan = document.createElement('span')
      hiddenSpan.classList.add('govuk-visually-hidden')
      hiddenSpan.textContent = ' filter menu'
      this.closeButton.appendChild(hiddenSpan)

      this.closeButton.addEventListener('click', this.onCloseClick.bind(this))
      this.options.closeButton.container.appendChild(this.closeButton)
    }
  }

  onCloseClick() {
    this.hideMenu()
    if (this.menuButton) {
      this.menuButton.focus()
    }
  }

  removeCloseButton() {
    if (this.closeButton) {
      this.closeButton.remove()
      this.closeButton = null
    }
  }

  addMenuButton() {
    this.menuButton = document.createElement('button')
    this.menuButton.type = 'button'
    this.menuButton.classList.add('govuk-button')
    // If you have multiple classes, just split them
    this.options.toggleButton.classes.split(' ').forEach(cls => {
      this.menuButton.classList.add(cls)
    })
    this.menuButton.setAttribute('aria-haspopup', 'true')
    this.menuButton.setAttribute('aria-expanded', 'false')
    this.menuButton.textContent = this.options.toggleButton.showText

    this.menuButton.addEventListener('click', this.onMenuButtonClick.bind(this))
    this.options.toggleButton.container.appendChild(this.menuButton)
  }

  removeMenuButton() {
    if (this.menuButton) {
      this.menuButton.remove()
      this.menuButton = null
    }
  }

  hideMenu() {
    if (this.menuButton) {
      this.menuButton.setAttribute('aria-expanded', 'false')
      this.menuButton.textContent = this.options.toggleButton.showText
    }
    this.options.filter.container.setAttribute('hidden', '')
  }

  showMenu() {
    if (this.menuButton) {
      this.menuButton.setAttribute('aria-expanded', 'true')
      this.menuButton.textContent = this.options.toggleButton.hideText
    }
    this.options.filter.container.removeAttribute('hidden')
  }

  onMenuButtonClick() {
    this.toggle()
  }

  toggle() {
    const isExpanded = this.menuButton && this.menuButton.getAttribute('aria-expanded') === 'true'
    if (!isExpanded) {
      this.showMenu()
      this.options.filter.container.focus()
    } else {
      this.hideMenu()
    }
  }

  init() {
    this.setupResponsiveChecks()
    if (this.options.startHidden) {
      this.hideMenu()
    }
  }
}
