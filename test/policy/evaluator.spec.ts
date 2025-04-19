import { evaluate, evaluateCondition, matches } from '../../policy/evaluator';
import { Effect, Policy, PolicyStatement } from '../../models';

describe('Policy Evaluator', () => {
  describe('evaluateCondition', () => {
    it('should return true when all conditions match the context', () => {
      const condition = { department: 'engineering', country: 'USA' };
      const context = { department: 'engineering', country: 'USA', role: 'developer' };
      
      expect(evaluateCondition(condition, context)).toBe(true);
    });

    it('should return false when any condition does not match the context', () => {
      const condition = { department: 'engineering', country: 'USA' };
      const context = { department: 'engineering', country: 'Canada', role: 'developer' };
      
      expect(evaluateCondition(condition, context)).toBe(false);
    });

    it('should return false when context is missing required condition keys', () => {
      const condition = { department: 'engineering', country: 'USA' };
      const context = { department: 'engineering' };
      
      expect(evaluateCondition(condition, context)).toBe(false);
    });
  });

  describe('matches', () => {
    it('should return true for exact string match', () => {
      expect(matches('read', 'read')).toBe(true);
    });

    it('should return false for non-matching strings', () => {
      expect(matches('read', 'write')).toBe(false);
    });

    it('should handle wildcard at the beginning', () => {
      expect(matches('*:document', 'read:document')).toBe(true);
      expect(matches('*:document', 'write:document')).toBe(true);
      expect(matches('*:document', 'document')).toBe(false);
    });

    it('should handle wildcard at the end', () => {
      expect(matches('document:*', 'document:read')).toBe(true);
      expect(matches('document:*', 'document:write')).toBe(true);
      expect(matches('document:*', 'document')).toBe(false);
    });

    it('should handle wildcard in the middle', () => {
      expect(matches('document:*:sensitive', 'document:read:sensitive')).toBe(true);
      expect(matches('document:*:sensitive', 'document:write:sensitive')).toBe(true);
      expect(matches('document:*:sensitive', 'document:sensitive')).toBe(false);
    });

    it('should handle multiple wildcards', () => {
      expect(matches('*:document:*', 'read:document:public')).toBe(true);
      expect(matches('*:document:*', 'write:document:secret')).toBe(true);
      expect(matches('*:document:*', 'document')).toBe(false);
    });

    it('should check against array of patterns', () => {
      expect(matches(['read:*', 'write:document'], 'read:document')).toBe(true);
      expect(matches(['read:*', 'write:document'], 'write:document')).toBe(true);
      expect(matches(['read:*', 'write:document'], 'delete:document')).toBe(false);
    });
  });

  describe('evaluate', () => {
    const createPolicy = (id: string, statements: PolicyStatement[]): Policy => ({
      id,
      document: {
        Version: '2023-10-17',
        Statement: statements
      }
    });

    it('should return false when no policies are provided', () => {
      expect(evaluate([], 'read', 'document')).toBe(false);
    });

    it('should return true when action and resource match an Allow policy', () => {
      const policy = createPolicy('p1', [{
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document']
      }]);
      
      expect(evaluate([policy], 'read', 'document')).toBe(true);
    });

    it('should return false when action and resource match a Deny policy', () => {
      const policy = createPolicy('p1', [{
        Effect: Effect.Deny,
        Action: ['read'],
        Resource: ['document']
      }]);
      
      expect(evaluate([policy], 'read', 'document')).toBe(false);
    });

    it('should handle wildcard patterns in actions and resources', () => {
      const policy = createPolicy('p1', [{
        Effect: Effect.Allow,
        Action: ['read:*'],
        Resource: ['document:*']
      }]);
      
      expect(evaluate([policy], 'read:metadata', 'document:report')).toBe(true);
    });

    it('should enforce deny-override across multiple policies', () => {
      const allowPolicy = createPolicy('p1', [{
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document']
      }]);
      
      const denyPolicy = createPolicy('p2', [{
        Effect: Effect.Deny,
        Action: ['read'],
        Resource: ['document']
      }]);
      
      expect(evaluate([allowPolicy, denyPolicy], 'read', 'document')).toBe(false);
      expect(evaluate([denyPolicy, allowPolicy], 'read', 'document')).toBe(false);
    });

    it('should evaluate conditions in statements', () => {
      const policy = createPolicy('p1', [{
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        Condition: { department: 'engineering' }
      }]);
      
      expect(evaluate([policy], 'read', 'document', { department: 'engineering' })).toBe(true);
      expect(evaluate([policy], 'read', 'document', { department: 'marketing' })).toBe(false);
    });

    it('should handle multiple statements in a policy', () => {
      const policy = createPolicy('p1', [
        {
          Effect: Effect.Allow,
          Action: ['read'],
          Resource: ['document']
        },
        {
          Effect: Effect.Deny,
          Action: ['read'],
          Resource: ['document:secret']
        }
      ]);
      
      expect(evaluate([policy], 'read', 'document')).toBe(true);
      expect(evaluate([policy], 'read', 'document:secret')).toBe(false);
    });

    it('should handle multiple policies with different effects', () => {
      const policy1 = createPolicy('p1', [{
        Effect: Effect.Allow,
        Action: ['read', 'write'],
        Resource: ['*']
      }]);
      
      const policy2 = createPolicy('p2', [{
        Effect: Effect.Deny,
        Action: ['write'],
        Resource: ['document:secret']
      }]);
      
      expect(evaluate([policy1, policy2], 'read', 'document')).toBe(true);
      expect(evaluate([policy1, policy2], 'write', 'document')).toBe(true);
      expect(evaluate([policy1, policy2], 'write', 'document:secret')).toBe(false);
    });
  });
});