const { isValidEmail, isValidWordCount } = require('../helpers/validation')

exports.newFeedback_get = async (req, res) => {
  const { feedback } = req.session.data
  const wordCount = 200
  res.render('feedback/edit', {
    feedback,
    wordCount,
    actions: {
      back: '/',
      cancel: '/',
      save: '/feedback'
    }
  })
}

exports.newFeedback_post = async (req, res) => {
  const { feedback } = req.session.data
  const wordCount = 200
  const errors = []

  if (!feedback?.satisfaction) {
    const error = {}
    error.fieldName = 'satisfaction'
    error.href = '#feedback-satisfaction'
    error.text = 'Select how you feel about this service'
    errors.push(error)
  }

  if (!feedback?.details.length) {
    const error = {}
    error.fieldName = 'details'
    error.href = '#feedback-details'
    error.text = 'Enter details about how we could improve this service'
    errors.push(error)
  } else if (!isValidWordCount(feedback.details, wordCount)) {
    const error = {}
    error.fieldName = 'details'
    error.href = '#feedback-details'
    error.text = `Details must be ${wordCount} words or fewer`
    errors.push(error)
  }

  if (feedback?.email && !isValidEmail(feedback.email)) {
    const error = {}
    error.fieldName = 'email'
    error.href = '#feedback-email'
    error.text = 'Enter an email address in the correct format, like name@example.com'
    errors.push(error)
  }

  if (errors.length) {
    res.render('feedback/edit', {
      feedback,
      wordCount,
      errors,
      actions: {
        back: '/',
        cancel: '/',
        save: '/feedback'
      }
    })
  } else {
    res.redirect('feedback/check')
  }
}

exports.newFeedbackCheck_get = async (req, res) => {
  const { feedback } = req.session.data
  res.render('feedback/check-your-answers', {
    feedback,
    actions: {
      back: '/feedback',
      cancel: '/',
      change: '/feedback',
      save: '/feedback/check'
    }
  })
}

exports.newFeedbackCheck_post = async (req, res) => {
  delete req.session.data.feedback
  res.redirect('/feedback/confirmation')
}

exports.newFeedbackConfirmation_get = async (req, res) => {
  res.render('feedback/confirmation', {
    actions: {
      home: '/'
    }
  })
}
