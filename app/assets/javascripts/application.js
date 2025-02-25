//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//
import { FilterToggleButton } from '/public/javascripts/components/filter-toggle-button.js'

window.GOVUKPrototypeKit.documentReady(() => {
  const filterToggleButton = new FilterToggleButton({
    bigModeMediaQuery: '(min-width: 48.063em)',
    startHidden: false,
    toggleButton: {
      container: document.querySelector('.app-action-bar__filter'),
      showText: 'Show filter',
      hideText: 'Hide filter',
      classes: 'govuk-button--secondary govuk-!-margin-bottom-3'
    },
    closeButton: {
      container: document.querySelector('.app-filter__header-action'),
      text: 'Close'
    },
    filter: {
      container: document.querySelector('.app-filter-layout__filter')
    }
  })
  filterToggleButton.init()
})
