import { Policy } from "../models";

/**
 * Evaluates if a condition matches the provided context
 * @param condition - Key-value pairs representing conditions to check
 * @param context - The context object containing values to compare against
 * @returns True if all conditions match the context values, false otherwise
 */
export const evaluateCondition = (condition: Record<string, string>, context: Record<string, any>): boolean =>
    Object.entries(condition).every(([key, value]) => context[key] === value);

/**
 * Escapes special regex characters in a string
 * @param string - The string to escape
 * @returns A string with all regex special characters escaped
 */
const escapeRegExp = (string: string): string =>
    string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * Checks if a value matches a pattern or array of patterns
 * Supports wildcard (*) matching
 * @param pattern - A string pattern or array of patterns to match against
 * @param value - The string value to test
 * @returns True if the value matches any of the patterns, false otherwise
 */
export const matches = (pattern: string | string[], value: string): boolean => {
    if (Array.isArray(pattern)) {
        return pattern.some(p => matches(p, value));
    }

    if (pattern.includes('*')) {
        const regexString = "^" + pattern.split('*').map(escapeRegExp).join('.*') + "$";
        const regex = new RegExp(regexString);
        return regex.test(value);
    }
    return pattern === value;
}

/**
 * Evaluates access policies to determine if an action on a resource is allowed
 * Follows deny-override logic: explicit deny takes precedence over allows
 * 
 * @param policies - Array of Policy objects to evaluate
 * @param action - The action being performed
 * @param resource - The resource the action is performed on
 * @param context - Optional context for condition evaluation
 * @returns True if the action is allowed, false otherwise
 */
export const evaluate = (
    policies: Policy[],
    action: string,
    resource: string,
    context: Record<string, string> = {}
): boolean => {
    let isAllowed = false;
    for (const policy of policies) {
        const { document } = policy;
        const statements = Array.isArray(document.Statement) ? document.Statement : [document.Statement];

        for (const statement of statements) {
            if (statement.Condition && !evaluateCondition(statement.Condition, context)) {
                continue;
            }
            if (matches(statement.Action, action) && matches(statement.Resource, resource)) {
                if (statement.Effect === 'Allow') {
                    isAllowed = true;
                } else if (statement.Effect === 'Deny') {
                    return false;
                }
            }
        }

    }
    return isAllowed;
}