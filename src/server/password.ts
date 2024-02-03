import crypto from 'crypto'

export function hashPassword(password: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const passwordBuffer = Buffer.from(password, 'utf8')
    const saltBuffer = crypto.randomBytes(16)
    const iterations = 100000
    const keyLength = 64
    const digest = 'sha512'
    crypto.pbkdf2(passwordBuffer, saltBuffer, iterations, keyLength, digest, (err, hashBuffer) => {
      if (!err) {
        resolve(
          `pbkdf2:${digest}:${keyLength}:${iterations}:${saltBuffer.toString('base64')}:${hashBuffer.toString(
            'base64'
          )}}`
        )
      } else {
        reject(err)
      }
    })
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const [id, digest, keyLengthStr, iterationsStr, saltBufferStr, hashBufferStr] = hash.split(':', 7)
    if (id !== 'pbkdf2') {
      return reject(new Error('Unsupported hash format'))
    }
    const keyLength = Number.parseInt(keyLengthStr, 10)
    if (!Number.isInteger(keyLength)) {
      return reject(new Error('Unsupported hash format'))
    }
    const iterations = Number.parseInt(iterationsStr, 10)
    if (!Number.isInteger(iterations)) {
      return reject(new Error('Unsupported hash format'))
    }
    if (iterations < 1) {
      return reject(new Error('Unsupported hash format'))
    }
    if (iterations > 1000000) {
      return reject(new Error('Unsupported hash format'))
    }
    const saltBuffer = Buffer.from(saltBufferStr, 'base64')
    const hashBuffer = Buffer.from(hashBufferStr, 'base64')
    const passwordBuffer = Buffer.from(password, 'utf8')
    crypto.pbkdf2(passwordBuffer, saltBuffer, iterations, keyLength, digest, (err, calculatedHashBuffer) => {
      if (!err) {
        if (calculatedHashBuffer.length !== hashBuffer.length) {
          return resolve(false)
        }
        resolve(crypto.timingSafeEqual(calculatedHashBuffer, hashBuffer))
      } else {
        reject(err)
      }
    })
  })
}
