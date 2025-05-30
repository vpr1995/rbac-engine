import { Policy, PolicyDocument, PolicyStatement } from '../models';
import { StatementBuilder } from './statement-builder';
import { BuilderValidationError, BuilderValidationResult } from './types';

/**
 * Builder for creating complete policies with a fluent API
 * 
 * @example
 * // Simple policy with single statement
 * const policy = new PolicyBuilder('policy-123')
 *   .version('2023-11-15')
 *   .allow(['read', 'write'])
 *   .on(['document/*'])
 *   .when({ department: 'engineering' })
 *   .build();
 * 
 * @example
 * // Complex policy with multiple statements
 * const policy = new PolicyBuilder('policy-456')
 *   .version('2023-11-15')
 *   .statement(
 *     new StatementBuilder()
 *       .allow(['read', 'write'])
 *       .on(['document/*'])
 *       .when({ department: 'engineering' })
 *   )
 *   .statement(
 *     new StatementBuilder()
 *       .deny(['delete'])
 *       .on(['document/confidential/*'])
 *   )
 *   .build();
 */
export class PolicyBuilder {
    private policyId: string;
    private documentVersion: string = '2023-11-15';
    private policyStatements: PolicyStatement[] = [];
    private hasSimpleStatement: boolean = false;
    
    // Simple statement building properties
    private simpleStatementBuilder?: StatementBuilder;

    /**
     * Creates a new PolicyBuilder
     * 
     * @param id - The unique identifier for this policy
     */
    constructor(id: string) {
        this.policyId = id;
    }

    /**
     * Sets the version of the policy document
     * 
     * @param version - The version string (defaults to '2023-11-15')
     * @returns This builder instance for method chaining
     */
    version(version: string): this {
        this.documentVersion = version;
        return this;
    }

    /**
     * Sets the effect to Allow and specifies the actions to allow
     * Creates a simple statement (cannot be used with statement() method)
     * 
     * @param actions - Array of actions to allow
     * @returns This builder instance for method chaining
     */
    allow(actions: string[]): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.allow(actions);
        return this;
    }

    /**
     * Sets the effect to Deny and specifies the actions to deny
     * Creates a simple statement (cannot be used with statement() method)
     * 
     * @param actions - Array of actions to deny
     * @returns This builder instance for method chaining
     */
    deny(actions: string[]): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.deny(actions);
        return this;
    }

    /**
     * Specifies the resources this policy applies to
     * Used for simple statement mode
     * 
     * @param resources - Array of resource patterns
     * @returns This builder instance for method chaining
     */
    on(resources: string[]): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.on(resources);
        return this;
    }

    /**
     * Adds conditions to this policy
     * Used for simple statement mode
     * 
     * @param conditions - Object containing condition key-value pairs
     * @returns This builder instance for method chaining
     */
    when(conditions: Record<string, any>): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.when(conditions);
        return this;
    }

    /**
     * Sets the start date when this policy becomes active
     * Used for simple statement mode
     * 
     * @param startDate - ISO format date string (UTC)
     * @returns This builder instance for method chaining
     */
    activeFrom(startDate: string): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.activeFrom(startDate);
        return this;
    }

    /**
     * Sets the end date when this policy expires
     * Used for simple statement mode
     * 
     * @param endDate - ISO format date string (UTC)
     * @returns This builder instance for method chaining
     */
    activeUntil(endDate: string): this {
        this.ensureSimpleStatementMode();
        this.simpleStatementBuilder!.activeUntil(endDate);
        return this;
    }

    /**
     * Adds a complete statement to this policy
     * Used for complex policies with multiple statements
     * 
     * @param statementBuilder - A StatementBuilder instance or built PolicyStatement
     * @returns This builder instance for method chaining
     */
    statement(statementBuilder: StatementBuilder | PolicyStatement): this {
        if (this.hasSimpleStatement) {
            throw new BuilderValidationError(
                'Cannot mix simple statement methods (allow/deny/on/when) with statement() method. ' +
                'Use either simple mode or complex mode, not both.'
            );
        }

        const statement = statementBuilder instanceof StatementBuilder 
            ? statementBuilder.build() 
            : statementBuilder;
            
        this.policyStatements.push(statement);
        return this;
    }

    /**
     * Adds multiple statements to this policy
     * 
     * @param statements - Array of StatementBuilder instances or PolicyStatements
     * @returns This builder instance for method chaining
     */
    addStatements(statements: (StatementBuilder | PolicyStatement)[]): this {
        statements.forEach(stmt => this.statement(stmt));
        return this;
    }

    /**
     * Ensures we're in simple statement mode and initializes the builder if needed
     */
    private ensureSimpleStatementMode(): void {
        if (this.policyStatements.length > 0) {
            throw new BuilderValidationError(
                'Cannot use simple statement methods (allow/deny/on/when) after using statement() method. ' +
                'Use either simple mode or complex mode, not both.'
            );
        }

        if (!this.simpleStatementBuilder) {
            this.simpleStatementBuilder = new StatementBuilder();
            this.hasSimpleStatement = true;
        }
    }

    /**
     * Validates the current builder state
     * 
     * @returns Validation result with errors if any
     */
    private validate(): BuilderValidationResult {
        const errors: string[] = [];

        // Check policy ID
        if (!this.policyId || typeof this.policyId !== 'string') {
            errors.push('Policy ID must be a non-empty string');
        }

        // Check version
        if (!this.documentVersion || typeof this.documentVersion !== 'string') {
            errors.push('Policy document version must be a non-empty string');
        }

        // Check statements
        const allStatements = this.getAllStatements();
        if (allStatements.length === 0) {
            errors.push('Policy must contain at least one statement. Use allow()/deny() methods or statement() method.');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Gets all statements including simple statement if exists
     */
    private getAllStatements(): PolicyStatement[] {
        const allStatements = [...this.policyStatements];
        
        if (this.hasSimpleStatement && this.simpleStatementBuilder) {
            try {
                allStatements.push(this.simpleStatementBuilder.build());
            } catch (error) {
                // If simple statement is invalid, validation will catch it
            }
        }
        
        return allStatements;
    }

    /**
     * Builds and returns the complete policy
     * Validates the policy before building and throws an error if invalid
     * 
     * @returns The constructed Policy
     * @throws BuilderValidationError if the policy is invalid
     */
    build(): Policy {
        const validation = this.validate();
        
        if (!validation.isValid) {
            throw new BuilderValidationError(
                'Invalid policy configuration',
                validation.errors
            );
        }

        // Build all statements
        const allStatements = this.getAllStatements();

        const document: PolicyDocument = {
            Version: this.documentVersion,
            Statement: allStatements
        };

        return {
            id: this.policyId,
            document
        };
    }

    /**
     * Static factory method for creating a new PolicyBuilder
     * 
     * @param id - The unique identifier for the policy
     * @returns A new PolicyBuilder instance
     */
    static create(id: string): PolicyBuilder {
        return new PolicyBuilder(id);
    }
}
