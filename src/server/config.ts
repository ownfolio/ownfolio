import path from 'path'

export interface WebConfig {
  userRegistrationEnabled: boolean
}

export interface Config {
  httpPort: number
  userEmail?: string
  userPassword?: string
  userRegistrationEnabled: boolean
  publicDirectory: string
}

export function createConfig(): Config {
  return {
    httpPort: getEnvNumber('HTTP_PORT', 3000),
    userEmail: getEnvString('USER_EMAIL', '').trim() || undefined,
    userPassword: getEnvString('USER_PASSWORD', '').trim() || undefined,
    userRegistrationEnabled: getEnvBoolean('USER_REGISTRATION_ENABLED', false),
    publicDirectory: path.resolve(__dirname, 'public'),
  }
}

export function configToWebConfig(config: Config): WebConfig {
  return {
    userRegistrationEnabled: config.userRegistrationEnabled,
  }
}

export function getEnvString(name: string, fallback?: string): string {
  const value = process.env[name]
  if (typeof value === 'string') {
    return value
  } else if (typeof fallback === 'string') {
    return fallback
  } else {
    throw new Error(`Environment variable ${name} is missing`)
  }
}

export function getEnvNumber(name: string, fallback?: number): number {
  const valueStr = process.env[name]
  if (typeof valueStr === 'string') {
    const value = Number.parseInt(valueStr, 10)
    if (Number.isFinite(value)) {
      return value
    } else {
      throw new Error(`Environment variable ${name} is not an integer`)
    }
  } else if (typeof fallback === 'number') {
    return fallback
  } else {
    throw new Error(`Environment variable ${name} is missing`)
  }
}

export function getEnvBoolean(name: string, fallback?: boolean): boolean {
  const valueStr = process.env[name]
  if (typeof valueStr === 'string') {
    if (['true', 'yes', '1'].indexOf(valueStr) >= 0) {
      return true
    } else if (['false', 'no', '0'].indexOf(valueStr) >= 0) {
      return false
    } else {
      throw new Error(`Environment variable ${name} is not a boolean`)
    }
  } else if (typeof fallback === 'boolean') {
    return fallback
  } else {
    throw new Error(`Environment variable ${name} is missing`)
  }
}
