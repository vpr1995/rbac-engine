/**
 * Builder pattern implementation for creating RBAC policies with a fluent API
 * 
 * This module provides builder classes that offer a more intuitive and type-safe
 * way to construct policies while maintaining full backward compatibility with
 * the existing object-based approach.
 * 
 * @example
 * // Simple policy with single statement
 * import { PolicyBuilder } from 'rbac-engine';
 * 
 * const policy = new PolicyBuilder('policy-123')
 *   .allow(['read', 'write'])
 *   .on(['document/*'])
 *   .when({ department: 'engineering' })
 *   .build();
 * 
 * @example
 * // Complex policy with multiple statements
 * import { PolicyBuilder, StatementBuilder } from 'rbac-engine';
 * 
 * const policy = new PolicyBuilder('policy-456')
 *   .statement(
 *     new StatementBuilder()
 *       .allow(['read', 'write'])
 *       .on(['document/*'])
 *   )
 *   .statement(
 *     new StatementBuilder()
 *       .deny(['delete'])
 *       .on(['document/confidential/*'])
 *   )
 *   .build();
 */

export { PolicyBuilder } from './policy-builder';
export { StatementBuilder } from './statement-builder';
export { BuilderValidationError, BuilderValidationResult } from './types';
