/**
 * Core data models for the RBAC Engine
 * 
 * This file defines the fundamental data structures used throughout the rbac-engine package,
 * including User, Role, Policy, and related types.
 */

/**
 * Represents a user in the system
 * 
 * Users can have roles assigned to them and policies attached directly.
 */
export interface User {
    id: string;
    name: string;
    roles?: string[];
    policies?: string[];
}

/**
 * Represents a role in the system
 * 
 * Roles are collections of permissions that can be assigned to users.
 * This makes permission management easier as multiple users can share the same role.
 */
export interface Role {
    id: string;
    name: string;
    policies?: string[];
}

/**
 * Effect of a policy statement - either Allow or Deny
 */
export enum Effect {
    Allow = 'Allow',
    Deny = 'Deny'
}

/**
 * A single statement within a policy document
 * 
 * Each statement defines a permission rule with an effect (Allow/Deny),
 * actions, resources, and optional conditions.
 */
export interface PolicyStatement {
    Effect: Effect;
    Action: string[];
    Resource: string[];
    Condition?: Record<string, any>;
}

/**
 * A complete policy document
 * 
 * Policy documents contain one or more statements that define permissions.
 */
export interface PolicyDocument {
    Version: string;
    Statement: PolicyStatement[];
}

/**
 * Represents a policy in the system
 * 
 * Policies define what actions are allowed or denied on what resources.
 */
export interface Policy {
    id: string;
    document: PolicyDocument;
}