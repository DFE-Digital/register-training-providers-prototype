class ButtonMenu {
  constructor ($root) {
    this.$root = $root
    this.$toggle = null
    this.$menu = null
    this.$items = null
    this.handleDocumentClick = this.handleDocumentClick.bind(this)
  }

  init () {
    if (!this.$root) return

    if (this.$root.children.length === 1) {
      const $button = this.$root.children[0]

      $button.classList.forEach((className) => {
        if (className.startsWith('govuk-button-')) {
          $button.classList.remove(className)
        }

        $button.classList.remove('app-button-menu__item')
        $button.classList.add('app-button-menu__single-button')
      })

      const buttonClasses = this.$root.getAttribute('data-button-classes')
      if (buttonClasses) {
        $button.classList.add(...buttonClasses.split(' '))
      }
    }

    if (this.$root.children.length > 1) {
      this.$root.classList.add('app-button-menu--js-enabled')
      this.initMenu()
    }
  }

  initMenu () {
    this.$menu = this.createMenu()
    this.$root.insertAdjacentHTML('afterbegin', this.toggleTemplate())
    this.setupMenuItems()

    this.$toggle = this.$root.querySelector(':scope > button')
    this.$items = this.$menu.querySelectorAll('a, button')

    this.$toggle.addEventListener('click', (event) => {
      this.toggleMenu(event)
    })

    this.$root.addEventListener('keydown', (event) => {
      this.handleKeyDown(event)
    })

    document.addEventListener('click', this.handleDocumentClick)
  }

  createMenu () {
    const $menu = document.createElement('ul')

    $menu.setAttribute('role', 'list')
    $menu.hidden = true
    $menu.classList.add('app-button-menu__wrapper')

    const alignMenu = (this.$root.getAttribute('data-align-menu') || 'left').toLowerCase()
    if (alignMenu === 'right') {
      $menu.classList.add('app-button-menu__wrapper--right')
    }

    this.$root.appendChild($menu)

    while (this.$root.firstChild !== $menu) {
      $menu.appendChild(this.$root.firstChild)
    }

    return $menu
  }

  setupMenuItems () {
    Array.from(this.$menu.children).forEach(($menuItem) => {
      const $listItem = document.createElement('li')
      this.$menu.insertBefore($listItem, $menuItem)
      $listItem.appendChild($menuItem)

      $menuItem.setAttribute('tabindex', '-1')

      if ($menuItem.tagName === 'BUTTON') {
        $menuItem.setAttribute('type', 'button')
      }

      $menuItem.classList.forEach((className) => {
        if (className.startsWith('govuk-button')) {
          $menuItem.classList.remove(className)
        }
      })

      $menuItem.addEventListener('click', () => {
        setTimeout(() => {
          this.closeMenu(false)
        }, 50)
      })
    })
  }

  toggleTemplate () {
    const buttonText = this.$root.getAttribute('data-button-text') || 'Actions'
    const buttonClasses = this.$root.getAttribute('data-button-classes') || ''

    return `
    <button type="button" class="govuk-button app-button-menu__toggle-button ${buttonClasses}" aria-haspopup="true" aria-expanded="false">
      <span>
       ${buttonText}
       <svg width="11" height="5" viewBox="0 0 11 5"  xmlns="http://www.w3.org/2000/svg">
         <path d="M5.5 0L11 5L0 5L5.5 0Z" fill="currentColor"/>
       </svg>
      </span>
    </button>`
  }

  isOpen () {
    return this.$toggle.getAttribute('aria-expanded') === 'true'
  }

  toggleMenu (event) {
    event.preventDefault()

    const keyboardEvent = event.detail === 0
    const focusIndex = keyboardEvent ? 0 : -1

    if (this.isOpen()) {
      this.closeMenu()
    } else {
      this.openMenu(focusIndex)
    }
  }

  openMenu (focusIndex = 0) {
    this.$menu.hidden = false
    this.$toggle.setAttribute('aria-expanded', 'true')
    if (focusIndex !== -1) {
      this.focusItem(focusIndex)
    }
  }

  closeMenu (moveFocus = true) {
    this.$menu.hidden = true
    this.$toggle.setAttribute('aria-expanded', 'false')
    if (moveFocus) {
      this.$toggle.focus()
    }
  }

  focusItem (index) {
    if (index >= this.$items.length) index = 0
    if (index < 0) index = this.$items.length - 1

    const $menuItem = this.$items.item(index)
    if ($menuItem) {
      $menuItem.focus()
    }
  }

  currentFocusIndex () {
    const $activeElement = document.activeElement
    const $menuItems = Array.from(this.$items)

    return (
      ($activeElement instanceof HTMLAnchorElement ||
        $activeElement instanceof HTMLButtonElement) &&
      $menuItems.indexOf($activeElement)
    )
  }

  handleDocumentClick (event) {
    if (!this.$root.contains(event.target)) {
      this.closeMenu(false)
    }
  }

  handleKeyDown (event) {
    if (event.target === this.$toggle) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          this.openMenu()
          break
        case 'ArrowUp':
          event.preventDefault()
          this.openMenu(this.$items.length - 1)
          break
      }
    }

    if (
      event.target instanceof Node &&
      this.$menu.contains(event.target) &&
      this.isOpen()
    ) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          if (this.currentFocusIndex() !== -1) {
            this.focusItem(this.currentFocusIndex() + 1)
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          if (this.currentFocusIndex() !== -1) {
            this.focusItem(this.currentFocusIndex() - 1)
          }
          break
        case 'Home':
          event.preventDefault()
          this.focusItem(0)
          break
        case 'End':
          event.preventDefault()
          this.focusItem(this.$items.length - 1)
          break
      }
    }

    if (event.key === 'Escape' && this.isOpen()) {
      this.closeMenu()
    }
    if (event.key === 'Tab' && this.isOpen()) {
      this.closeMenu(false)
    }
  }
}

export { ButtonMenu }
