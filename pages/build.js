require('ts-node').register()

const fs = require('fs/promises')
const path = require('path')
const markdownIt = require('markdown-it')

const build = benchmark('build', async () => {
  await clear()
  await buildPages()
})

const buildPages = benchmark('buildHtml', async () => {
  await fs.mkdir(path.resolve(__dirname, 'dist'))
  await fs.cp(path.resolve(__dirname, 'robots.txt'), path.resolve(__dirname, 'dist/robots.txt'))
  await fs.cp(path.resolve(__dirname, '../src/web/favicon.png'), path.resolve(__dirname, 'dist/favicon.png'))
  await fs.mkdir(path.resolve(__dirname, 'dist/css'))
  await fs.cp(path.resolve(__dirname, 'index.css'), path.resolve(__dirname, 'dist/css/index.css'))
  await fs.cp(require.resolve('normalize.css/normalize.css'), path.resolve(__dirname, 'dist/css/normalize.css'))
  await markdownToHtml(path.resolve(__dirname, 'index.md'), path.resolve(__dirname, 'dist/index.html'))
  await fs.cp(path.resolve(__dirname, '../temp/screenshots'), path.resolve(__dirname, 'dist/screenshots'), {
    recursive: true,
  })
})

const markdownToHtml = benchmark('markdownToHtml', async (input, output) => {
  const template = await fs.readFile(path.resolve(__dirname, 'index.tmpl.html'), 'utf-8')
  const markdown = await fs.readFile(input, 'utf-8')
  const html = markdownIt().render(markdown)
  const fullHtml = template.replaceAll('{{body}}', html)
  await fs.writeFile(output, fullHtml, 'utf-8')
})

const clear = benchmark('clear', async () => {
  await fs.rm(path.resolve(__dirname, 'dist'), { recursive: true, force: true })
})

function benchmark(name, fn) {
  return async (...args) => {
    const start = process.hrtime.bigint()
    const result = await fn(...args)
    const end = process.hrtime.bigint()
    console.log(`Running ${name} took ${(end - start) / 1000000n} milliseconds`)
    return result
  }
}

if (require.main === module) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
} else {
  module.exports = build
}
