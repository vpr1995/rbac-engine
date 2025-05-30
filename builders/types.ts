/**
 * Type definitions and interfaces specific to the builder pattern implementation
 */

/**
 * Error thrown when builder validation fails
 */
export class BuilderValidationError extends Error {
    constructor(message: string, public errors: string[] = []) {
        super(message);
        this.name = 'BuilderValidationError';
    }
}

/**
 * Result of builder validation
 */
export interface BuilderValidationResult {
    isValid: boolean;
    errors: string[];
}
