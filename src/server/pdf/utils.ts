import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'

const execTimeoutMillis = 120_000

// Ghostscript also runs PostScript, so files have to start like a PDF before they are passed to the PDF tools
export function isPdf(bytes: Buffer): boolean {
  return bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))
}

export async function execAsync(file: string, args: string[], input?: Buffer): Promise<Buffer> {
  if (['test', 'development'].includes(process.env.NODE_ENV || 'development')) {
    return execAsyncDocker(file, args, input)
  }
  return execAsyncDirect(file, args, input, execTimeoutMillis)
}

async function execAsyncDirect(file: string, args: string[], input?: Buffer, timeout?: number): Promise<Buffer> {
  const stdout = await new Promise<Buffer>((resolve, reject) => {
    const process = execFile(file, args, { encoding: 'buffer', maxBuffer: 10_000_000, timeout }, (err, stdout) => {
      if (err) {
        reject(err)
      } else {
        resolve(stdout)
      }
    })
    if (!process.stdin) {
      reject(new Error('no stdin'))
    } else {
      process.stdin.on('error', err => {
        reject(err)
      })
      if (input && input.length > 0) {
        process.stdin.write(input)
      }
      process.stdin.end()
    }
  })
  return stdout
}

async function execAsyncDocker(file: string, args: string[], input?: Buffer): Promise<Buffer> {
  await buildToolsDockerImage()
  return execAsyncDirect('docker', ['run', '--rm', '-i', 'ownfolio-tools', file, ...args], input, execTimeoutMillis)
}

let _toolsDockerImageBuilt = false
async function buildToolsDockerImage() {
  if (_toolsDockerImageBuilt) {
    return
  }

  // same tools as the production Dockerfile; dev and test always run from the repository root
  const imagemagickPolicy = fs.readFileSync(path.resolve('src/server/pdf/imagemagick-policy.xml'))
  const dockerfile = `FROM alpine:3.21.2
RUN apk add --no-cache nodejs
COPY --from=ghcr.io/ownfolio/pdfmake-cli:0.1.1 /usr/lib/pdfmake-cli /usr/lib/pdfmake-cli
RUN ln -s /usr/lib/pdfmake-cli/pdfmake-cli /usr/local/bin/pdfmake-cli
RUN apk add --no-cache imagemagick imagemagick-pdf
RUN echo '${imagemagickPolicy.toString('base64')}' | base64 -d > /etc/ImageMagick-7/policy.xml
RUN apk add --no-cache poppler-utils
`
  await execAsyncDirect('docker', ['build', '-t', 'ownfolio-tools', '-'], Buffer.from(dockerfile, 'utf-8'))
  _toolsDockerImageBuilt = true
}
