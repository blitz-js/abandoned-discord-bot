interface Config {
  NODE_ENV: string
  DATABASE_URL: string
  DISCORD_API_KEY: string
  DISCORD_DISCUSSIONS_CHANNEL: string
}

export const getConfig = (key: keyof Config, fallback?: string): string | never => {
  if (process.env[key]) {
    return process.env[key] as string
  }

  if (fallback) {
    return fallback
  }

  throw new Error(`${key} is not defined`)
}

export const isDev = () => getConfig("NODE_ENV", "development") === "development"
