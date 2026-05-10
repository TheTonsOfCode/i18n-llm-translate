/**
 * Thrown when the engine stops cleanly without dumping the wrapped API error to the console.
 * Use {@link isBreakSilentError} to detect. Pass `verboseEngineErrors: true` in translate options
 * to log {@link originalError} from translate()'s catch handler.
 */
export class BreakSilentError extends Error {
    readonly originalError: unknown;

    constructor(message: string, originalError: unknown) {
        super(message);
        this.name = 'BreakSilentError';
        this.originalError = originalError;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export function isBreakSilentError(e: unknown): e is BreakSilentError {
    return e instanceof BreakSilentError;
}
