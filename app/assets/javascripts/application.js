//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//
import { FilterToggleButton } from '/public/javascripts/components/filter-toggle-button.js'

window.GOVUKPrototypeKit.documentReady(() => {
  const filterContainer = document.querySelector('.app-filter-layout__filter')
  const actionBarFilterContainer = document.querySelector('.app-action-bar__filter')
  const filterHeaderActionContainer = document.querySelector('.app-filter__header-action')

  // Only create / init if filterContainer is present
  if (filterContainer && actionBarFilterContainer && filterHeaderActionContainer) {
    const filterToggleButton = new FilterToggleButton({
      bigModeMediaQuery: '(min-width: 48.063em)',
      startHidden: false,
      toggleButton: {
        container: actionBarFilterContainer,
        showText: 'Show filter',
        hideText: 'Hide filter',
        classes: 'govuk-button--secondary govuk-!-margin-bottom-3'
      },
      closeButton: {
        container: filterHeaderActionContainer,
        text: 'Close'
      },
      filter: {
        container: filterContainer
      }
    })
    filterToggleButton.init()
  }
})
