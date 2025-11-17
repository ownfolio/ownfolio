const esbuild = require('esbuild')
const fs = require('fs/promises')
const path = require('path')
const wyw = require('@wyw-in-js/esbuild')

const environment = process.env.NODE_ENV || 'development'
const production = environment === 'production'

const build = benchmark('build', async () => {
  await clear()
  await Promise.all([buildWeb(), buildServer(path.resolve(__dirname, 'src/server/index.ts'))])
})

const buildWeb = benchmark('buildWeb', async () => {
  await fs.mkdir(path.resolve(__dirname, 'dist'), { recursive: true })
  await fs.copyFile(path.resolve(__dirname, 'package.json'), path.resolve(__dirname, 'dist/package.json'))
  await fs.copyFile(path.resolve(__dirname, 'package-lock.json'), path.resolve(__dirname, 'dist/package-lock.json'))
  await fs.mkdir(path.resolve(__dirname, 'dist/public'), { recursive: true })
  const result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'src/web/index.tsx')],
    outdir: path.resolve(__dirname, 'dist/public'),
    platform: 'browser',
    entryNames: `[name]-[hash]`,
    bundle: true,
    sourcemap: true,
    minify: production,
    plugins: [
      wyw.default({
        sourceMap: true,
        classNameSlug: !production ? (hash, title, args) => `${args.name}__${title}__${hash}` : undefined,
      }),
    ],
    metafile: true,
  })
  const outputsFile = Object.keys(result.metafile.outputs)
  const outputJsFile = (outputsFile.find(f => /^dist\/public\/index-([A-Z0-9]+)\.js$/.test(f)) || '/index.js').replace(
    /^dist\/public/,
    ''
  )
  const outputCssFile = (
    outputsFile.find(f => /^dist\/public\/index-([A-Z0-9]+)\.css$/.test(f)) || '/index.css'
  ).replace(/^dist\/public/, '')
  const inputIndexHtmlContent = await fs.readFile(path.resolve(__dirname, 'src/web/index.html'), 'utf-8')
  const outputIndexHtmlContent = inputIndexHtmlContent
    .replace('/index.js', outputJsFile)
    .replace('/index.css', outputCssFile)
  await fs.writeFile(path.resolve(__dirname, 'dist/public/index.html'), outputIndexHtmlContent, 'utf-8')
  await fs.copyFile(path.resolve(__dirname, 'src/web/favicon.png'), path.resolve(__dirname, 'dist/public/favicon.png'))
  await fs.copyFile(
    path.resolve(__dirname, 'src/web/manifest.json'),
    path.resolve(__dirname, 'dist/public/manifest.json')
  )
})

const buildServer = benchmark('buildServer', async entryPoint => {
  await esbuild.build({
    entryPoints: [entryPoint],
    outdir: path.resolve(__dirname, 'dist'),
    platform: 'node',
    bundle: true,
    sourcemap: true,
    minify: production,
    loader: {
      '.node': 'file',
    },
  })
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
