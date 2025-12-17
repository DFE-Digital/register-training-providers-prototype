const path = require('path')
const fs = require('fs')
const matter = require('gray-matter')

const docsDirectory = path.join(__dirname, '../../views/api-docs/')

const buildBaseUrl = (req) => {
  const protoHeader = req.get('x-forwarded-proto')
  const protocol = protoHeader
    ? protoHeader.split(',')[0].trim()
    : (req.secure ? 'https' : req.protocol || 'http')
  const host = req.get('x-forwarded-host') || req.get('host')
  return `${protocol}://${host}`
}

const getDoc = (fileName) => {
  const filePath = path.join(docsDirectory, `${fileName}.md`)
  const doc = fs.readFileSync(filePath, 'utf8')
  return matter(doc)
}

exports.list = (req, res) => {
  res.render('../views/api-docs/index', {

  })
}

exports.providers = (req, res) => {
  const markdown = getDoc('providers')
  const baseUrl = buildBaseUrl(req)
  const content = markdown.content.replace(/{{\s*BASE_URL\s*}}/g, baseUrl)

  res.render('../views/api-docs/show', {
    contentData: markdown.data,
    content
  })
}
