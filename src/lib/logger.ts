import pino from "pino"

const isDev = process.env.NODE_ENV !== "production"

const pinoLogger = pino({
    level: isDev ? "debug" : "warn",
    transport: isDev
        ? {
              target: "pino-pretty",
              options: {
                  colorize: true,
                  translateTime: "HH:MM:ss",
                  ignore: "pid,hostname,category,data",
                  messageFormat: "\x1b[36m[{category}]\x1b[0m {msg}",
              },
          }
        : undefined,
})

export const logger = {
    debug: (category: string, message: string, ...args: unknown[]): void => {
        pinoLogger.debug({ category, data: args.length ? args : undefined }, message)
    },

    info: (category: string, message: string, ...args: unknown[]): void => {
        pinoLogger.info({ category, data: args.length ? args : undefined }, message)
    },

    warn: (category: string, message: string, ...args: unknown[]): void => {
        pinoLogger.warn({ category, data: args.length ? args : undefined }, message)
    },

    error: (category: string, message: string, ...args: unknown[]): void => {
        pinoLogger.error({ category, data: args.length ? args : undefined }, message)
    },
}
