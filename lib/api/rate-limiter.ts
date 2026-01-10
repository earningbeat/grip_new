/**
 * FMP API Rate Limiter
 * Ensures we don't exceed the 60 RPM (Requests Per Minute) limit of the Growth Plan.
 */
class RateLimiter {
    private queue: (() => void)[] = [];
    private lastCallTime: number = 0;
    private minInterval: number = 1100; // ~55 requests per minute, staying safe under 60

    async throttle(): Promise<void> {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;

        if (timeSinceLastCall < this.minInterval) {
            const waitTime = this.minInterval - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastCallTime = Date.now();
    }

    /**
     * Executes a function through the throttle.
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        await this.throttle();
        return fn();
    }
}

export const fmpRateLimiter = new RateLimiter();
