import { env } from "@/env"

type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

const getMinLogLevel = (): LogLevel => {
    if (env.NODE_ENV === "production") {
        return "warn"
    }
    return "debug"
}

const shouldLog = (level: LogLevel): boolean => {
    const minLevel = getMinLogLevel()
    return LOG_LEVELS[level] >= LOG_LEVELS[minLevel]
}

const formatMessage = (category: string, message: string): string => {
    return `[${category}] ${message}`
}

export const logger = {
    debug: (category: string, message: string, ...args: unknown[]): void => {
        if (shouldLog("debug")) {
            // eslint-disable-next-line no-console
            console.debug(formatMessage(category, message), ...args)
        }
    },

    info: (category: string, message: string, ...args: unknown[]): void => {
        if (shouldLog("info")) {
            // eslint-disable-next-line no-console
            console.info(formatMessage(category, message), ...args)
        }
    },

    warn: (category: string, message: string, ...args: unknown[]): void => {
        if (shouldLog("warn")) {
            // eslint-disable-next-line no-console
            console.warn(formatMessage(category, message), ...args)
        }
    },

    error: (category: string, message: string, ...args: unknown[]): void => {
        if (shouldLog("error")) {
            // eslint-disable-next-line no-console
            console.error(formatMessage(category, message), ...args)
        }
    },
}
