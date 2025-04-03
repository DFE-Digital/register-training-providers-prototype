exports.pageNotFound = (req, res) => {
  res.render('../views/errors/404')
}

exports.unexpectedError = (req, res) => {
  res.render('../views/errors/500')
}

exports.serviceUnavailable = (req, res) => {
  res.render('../views/errors/503')
}

exports.unauthorised = (req, res) => {
  res.render('../views/errors/unauthorised')
}

exports.accountNotRecognised = (req, res) => {
  res.render('../views/errors/account-not-recognised')
}

exports.accountNoOrganisation = (req, res) => {
  res.render('../views/errors/account-no-organisation')
}
