const path = require('path')
const fs = require('fs')
const matter = require('gray-matter')

const directoryPath = path.join(__dirname, '../content/')

const getContent = (params) => {
  const doc = fs.readFileSync(directoryPath + params.fileName + '.md', 'utf8')
  const content = matter(doc)
  return content
}

exports.accessibility = (req, res) => {
  const markdown = getContent({
    fileName: 'accessibility'
  })

  res.render('../views/content/show', {
    contentData: markdown.data,
    content: markdown.content
  })
}

exports.cookies = (req, res) => {
  const markdown = getContent({
    fileName: 'cookies'
  })

  res.render('../views/content/show', {
    contentData: markdown.data,
    content: markdown.content
  })
}

exports.privacy = (req, res) => {
  const markdown = getContent({
    fileName: 'privacy'
  })

  res.render('../views/content/show', {
    contentData: markdown.data,
    content: markdown.content
  })
}
