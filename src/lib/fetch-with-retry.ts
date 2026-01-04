/**
 * Fetch with retry utility
 * Provides exponential backoff with jitter for transient failures
 */

export type RetryOptions = {
    /** Maximum number of retries (default: 3) */
    maxRetries?: number
    /** Base delay in milliseconds (default: 1000) */
    baseDelayMs?: number
    /** Maximum delay in milliseconds (default: 16000) */
    maxDelayMs?: number
    /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
    retryableCodes?: number[]
}

const DEFAULT_RETRYABLE_CODES = [408, 429, 500, 502, 503, 504]

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
    attempt: number,
    baseDelayMs: number,
    maxDelayMs: number
): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = baseDelayMs * Math.pow(2, attempt)
    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, maxDelayMs)
    // Add jitter (random 0-25% of the delay)
    const jitter = cappedDelay * Math.random() * 0.25
    return cappedDelay + jitter
}

/**
 * Check if an error is retryable based on HTTP status code
 */
function isRetryableStatus(status: number, retryableCodes: number[]): boolean {
    return retryableCodes.includes(status)
}

/**
 * Fetch with automatic retry on transient failures
 *
 * @param url - The URL to fetch
 * @param init - Fetch options (same as native fetch)
 * @param options - Retry configuration options
 * @returns Response if successful
 * @throws Error if all retries exhausted or non-retryable error
 */
export async function fetchWithRetry(
    url: string,
    init?: RequestInit,
    options?: RetryOptions
): Promise<Response> {
    const maxRetries = options?.maxRetries ?? 3
    const baseDelayMs = options?.baseDelayMs ?? 1000
    const maxDelayMs = options?.maxDelayMs ?? 16000
    const retryableCodes = options?.retryableCodes ?? DEFAULT_RETRYABLE_CODES

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, init)

            // If response is OK or not retryable, return it
            if (response.ok || !isRetryableStatus(response.status, retryableCodes)) {
                return response
            }

            // Retryable status code - store for potential rethrow
            lastError = new Error(
                `HTTP ${String(response.status)} ${response.statusText} from ${url}`
            )

            // If this was the last attempt, throw
            if (attempt === maxRetries) {
                throw lastError
            }

            // Calculate delay and wait before retry
            const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs)
            await new Promise((resolve) => setTimeout(resolve, delay))
        } catch (error) {
            // Network errors are retryable
            if (error instanceof TypeError && error.message.includes("fetch")) {
                lastError = error
                if (attempt === maxRetries) {
                    throw error
                }
                const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs)
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }

            // Non-network errors (including our HTTP status errors) - rethrow
            throw error
        }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Unexpected retry loop exit")
}
