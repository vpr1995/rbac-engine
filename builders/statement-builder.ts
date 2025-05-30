import { PolicyStatement, Effect } from '../models';
import { BuilderValidationError, BuilderValidationResult } from './types';

/**
 * Builder for creating individual policy statements with a fluent API
 * 
 * @example
 * // Create an allow statement
 * const statement = new StatementBuilder()
 *   .allow(['read', 'write'])
 *   .on(['document/*'])
 *   .when({ department: 'engineering' })
 *   .activeFrom('2025-01-01T00:00:00Z')
 *   .activeUntil('2025-12-31T23:59:59Z')
 *   .build();
 * 
 * @example
 * // Create a deny statement
 * const statement = new StatementBuilder()
 *   .deny(['delete'])
 *   .on(['document/confidential/*'])
 *   .build();
 */
export class StatementBuilder {
    private effect?: Effect;
    private actions: string[] = [];
    private resources: string[] = [];
    private conditions?: Record<string, any>;
    private startDate?: string;
    private endDate?: string;

    /**
     * Sets the effect to Allow and specifies the actions to allow
     * 
     * @param actions - Array of actions to allow
     * @returns This builder instance for method chaining
     */
    allow(actions: string[]): this {
        this.effect = Effect.Allow;
        this.actions = [...actions];
        return this;
    }

    /**
     * Sets the effect to Deny and specifies the actions to deny
     * 
     * @param actions - Array of actions to deny
     * @returns This builder instance for method chaining
     */
    deny(actions: string[]): this {
        this.effect = Effect.Deny;
        this.actions = [...actions];
        return this;
    }

    /**
     * Specifies the resources this statement applies to
     * 
     * @param resources - Array of resource patterns
     * @returns This builder instance for method chaining
     */
    on(resources: string[]): this {
        this.resources = [...resources];
        return this;
    }

    /**
     * Adds conditions to this statement
     * 
     * @param conditions - Object containing condition key-value pairs
     * @returns This builder instance for method chaining
     */
    when(conditions: Record<string, any>): this {
        this.conditions = { ...conditions };
        return this;
    }

    /**
     * Sets the start date when this statement becomes active
     * 
     * @param startDate - ISO format date string (UTC)
     * @returns This builder instance for method chaining
     */
    activeFrom(startDate: string): this {
        this.startDate = startDate;
        return this;
    }

    /**
     * Sets the end date when this statement expires
     * 
     * @param endDate - ISO format date string (UTC)
     * @returns This builder instance for method chaining
     */
    activeUntil(endDate: string): this {
        this.endDate = endDate;
        return this;
    }

    /**
     * Validates the current builder state
     * 
     * @returns Validation result with errors if any
     */
    private validate(): BuilderValidationResult {
        const errors: string[] = [];

        // Check required fields
        if (!this.effect) {
            errors.push('Effect must be set using either allow() or deny()');
        }

        if (this.actions.length === 0) {
            errors.push('At least one action must be specified');
        }

        if (this.resources.length === 0) {
            errors.push('At least one resource must be specified using on()');
        }

        // Validate actions are non-empty strings
        if (this.actions.some(action => !action || typeof action !== 'string')) {
            errors.push('All actions must be non-empty strings');
        }

        // Validate resources are non-empty strings
        if (this.resources.some(resource => !resource || typeof resource !== 'string')) {
            errors.push('All resources must be non-empty strings');
        }

        // Validate date formats if provided
        if (this.startDate) {
            const startDate = new Date(this.startDate);
            if (isNaN(startDate.getTime())) {
                errors.push('StartDate must be a valid ISO format date string');
            }
        }

        if (this.endDate) {
            const endDate = new Date(this.endDate);
            if (isNaN(endDate.getTime())) {
                errors.push('EndDate must be a valid ISO format date string');
            }
        }

        // Validate date relationship if both are provided
        if (this.startDate && this.endDate) {
            const startDate = new Date(this.startDate);
            const endDate = new Date(this.endDate);
            if (startDate.getTime() >= endDate.getTime()) {
                errors.push('StartDate must be before EndDate');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Builds and returns the policy statement
     * Validates the statement before building and throws an error if invalid
     * 
     * @returns The constructed PolicyStatement
     * @throws BuilderValidationError if the statement is invalid
     */
    build(): PolicyStatement {
        const validation = this.validate();
        
        if (!validation.isValid) {
            throw new BuilderValidationError(
                'Invalid statement configuration',
                validation.errors
            );
        }

        const statement: PolicyStatement = {
            Effect: this.effect!,
            Action: [...this.actions],
            Resource: [...this.resources]
        };

        // Add optional fields if they exist
        if (this.conditions) {
            statement.Condition = { ...this.conditions };
        }

        if (this.startDate) {
            statement.StartDate = this.startDate;
        }

        if (this.endDate) {
            statement.EndDate = this.endDate;
        }

        return statement;
    }
}
