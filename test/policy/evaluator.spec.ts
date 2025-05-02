import { evaluate, evaluateCondition, matches, isStatementActive } from '../../policy/evaluator';
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

  describe('isStatementActive', () => {
    // Define the fixed date for tests - May 1, 2025 12:00:00 UTC
    const testDate = new Date(Date.UTC(2025, 4, 1, 12, 0, 0));
    
    beforeEach(() => {
      // Set the system time to our fixed date before each test
      jest.useFakeTimers().setSystemTime(testDate);
    });
    
    afterEach(() => {
      // Reset timers after each test
      jest.useRealTimers();
    });
    
    it('should return true when no date constraints are provided', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document']
      };
      
      expect(isStatementActive(statement)).toBe(true);
    });
    
    it('should return true when current time is after StartDate', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: '2025-04-01T00:00:00Z' // One month before current date
      };
      
      expect(isStatementActive(statement)).toBe(true);
    });
    
    it('should return false when current time is before StartDate', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: '2025-06-01T00:00:00Z' // One month after current date
      };
      
      expect(isStatementActive(statement)).toBe(false);
    });
    
    it('should return true when current time is before EndDate', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        EndDate: '2025-06-01T00:00:00Z' // One month after current date
      };
      
      expect(isStatementActive(statement)).toBe(true);
    });
    
    it('should return false when current time is after EndDate', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        EndDate: '2025-04-01T00:00:00Z' // One month before current date
      };
      
      expect(isStatementActive(statement)).toBe(false);
    });
    
    it('should return true when current time is within date range', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: '2025-04-01T00:00:00Z', // One month before current date
        EndDate: '2025-06-01T00:00:00Z'    // One month after current date
      };
      
      expect(isStatementActive(statement)).toBe(true);
    });
    
    it('should return false when current time is outside date range (too early)', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: '2025-06-01T00:00:00Z', // One month after current date
        EndDate: '2025-07-01T00:00:00Z'    // Two months after current date
      };
      
      expect(isStatementActive(statement)).toBe(false);
    });
    
    it('should return false when current time is outside date range (too late)', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: '2025-01-01T00:00:00Z', // Four months before current date
        EndDate: '2025-04-01T00:00:00Z'    // One month before current date
      };
      
      expect(isStatementActive(statement)).toBe(false);
    });
    
    it('should return false when date format is invalid', () => {
      const statement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document'],
        StartDate: 'invalid-date'
      };
      
      expect(isStatementActive(statement)).toBe(false);
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
    
    // Tests for time-based policies
    describe('with date constraints', () => {
      // Define the fixed date for tests - May 1, 2025 12:00:00 UTC
      const testDate = new Date(Date.UTC(2025, 4, 1, 12, 0, 0));
      
      beforeEach(() => {
        // Set the system time to our fixed date before each test
        jest.useFakeTimers().setSystemTime(testDate);
      });
      
      afterEach(() => {
        // Reset timers after each test
        jest.useRealTimers();
      });

      it('should allow access when policy is within active date range', () => {
        const policy = createPolicy('p1', [{
          Effect: Effect.Allow,
          Action: ['read'],
          Resource: ['document'],
          StartDate: '2025-04-01T00:00:00Z', // One month before current date
          EndDate: '2025-06-01T00:00:00Z'    // One month after current date
        }]);
        
        expect(evaluate([policy], 'read', 'document')).toBe(true);
      });
      
      it('should deny access when policy has not yet become active', () => {
        const policy = createPolicy('p1', [{
          Effect: Effect.Allow,
          Action: ['read'],
          Resource: ['document'],
          StartDate: '2025-06-01T00:00:00Z', // One month after current date
        }]);
        
        expect(evaluate([policy], 'read', 'document')).toBe(false);
      });
      
      it('should deny access when policy has expired', () => {
        const policy = createPolicy('p1', [{
          Effect: Effect.Allow,
          Action: ['read'],
          Resource: ['document'],
          EndDate: '2025-04-01T00:00:00Z', // One month before current date
        }]);
        
        expect(evaluate([policy], 'read', 'document')).toBe(false);
      });
      
      it('should correctly handle mixed time-constrained and regular policies', () => {
        const expiredPolicy = createPolicy('p1', [{
          Effect: Effect.Allow,
          Action: ['write'],
          Resource: ['document'],
          EndDate: '2025-04-01T00:00:00Z', // Expired policy
        }]);
        
        const futurePolicy = createPolicy('p2', [{
          Effect: Effect.Allow,
          Action: ['delete'],
          Resource: ['document'],
          StartDate: '2025-06-01T00:00:00Z', // Future policy
        }]);
        
        const activePolicy = createPolicy('p3', [{
          Effect: Effect.Allow,
          Action: ['read'],
          Resource: ['document'],
          StartDate: '2025-04-01T00:00:00Z', // Active policy
          EndDate: '2025-06-01T00:00:00Z',
        }]);
        
        const regularPolicy = createPolicy('p4', [{
          Effect: Effect.Allow,
          Action: ['list'],
          Resource: ['document'],
        }]);
        
        const policies = [expiredPolicy, futurePolicy, activePolicy, regularPolicy];
        
        expect(evaluate(policies, 'read', 'document')).toBe(true);    // Allowed by active policy
        expect(evaluate(policies, 'list', 'document')).toBe(true);    // Allowed by regular policy
        expect(evaluate(policies, 'write', 'document')).toBe(false);  // Denied due to expired policy
        expect(evaluate(policies, 'delete', 'document')).toBe(false); // Denied due to future policy
      });
    });
  });
});