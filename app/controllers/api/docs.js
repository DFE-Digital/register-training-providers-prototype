const path = require('path')
const fs = require('fs')
const matter = require('gray-matter')

const docsDirectory = path.join(__dirname, '../../views/api-docs/')

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

  res.render('../views/api-docs/show', {
    contentData: markdown.data,
    content: markdown.content
  })
}
