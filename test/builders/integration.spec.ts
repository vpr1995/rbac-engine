import { AccessControl } from '../../core';
import { PolicyBuilder, StatementBuilder } from '../../builders';
import { Effect, Policy } from '../../models';
import { IBaseRepository } from '../../db/base-repo';

// Mock the policy evaluator module
jest.mock('../../policy/evaluator', () => ({
  evaluate: jest.fn()
}));

// Mock the db factory module
jest.mock('../../db/factory', () => ({
  createRepository: jest.fn()
}));

describe('AccessControl Builder Integration', () => {
  let accessControl: AccessControl<any>;
  let mockRepository: jest.Mocked<IBaseRepository>;

  beforeEach(() => {
    // Create a mock repository
    mockRepository = {
      setupTables: jest.fn().mockResolvedValue(undefined),
      createUser: jest.fn(),
      getUser: jest.fn(),
      createRole: jest.fn(),
      getRole: jest.fn(),
      assignRoleToUser: jest.fn(),
      createPolicy: jest.fn(),
      updatePolicy: jest.fn(),
      updateRole: jest.fn(),
      deletePolicy: jest.fn(),
      deleteRole: jest.fn(),
      attachPolicyToRole: jest.fn(),
      attachPolicyToUser: jest.fn(),
      getUserPolicies: jest.fn(),
      getRolePolicies: jest.fn(),
      detachPolicyFromRole: jest.fn(),
      detachPolicyFromUser: jest.fn(),
      removeRoleFromUser: jest.fn()
    };

    // Mock the factory to return our mock repository
    const { createRepository } = require('../../db/factory');
    createRepository.mockReturnValue(mockRepository);

    // Create AccessControl instance
    accessControl = new AccessControl({}, jest.fn());
  });

  describe('Backward Compatibility', () => {
    it('should accept traditional Policy objects', async () => {
      const traditionalPolicy: Policy = {
        id: 'traditional-policy',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read', 'write'],
              Resource: ['document/*'],
              Condition: { department: 'engineering' }
            }
          ]
        }
      };

      mockRepository.createPolicy.mockResolvedValue(traditionalPolicy);

      const result = await accessControl.createPolicy(traditionalPolicy);

      expect(mockRepository.createPolicy).toHaveBeenCalledWith(traditionalPolicy);
      expect(result).toEqual(traditionalPolicy);
    });

    it('should handle complex traditional policies with multiple statements', async () => {
      const complexTraditionalPolicy: Policy = {
        id: 'complex-traditional',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read'],
              Resource: ['document/*']
            },
            {
              Effect: Effect.Deny,
              Action: ['delete'],
              Resource: ['document/confidential/*']
            }
          ]
        }
      };

      mockRepository.createPolicy.mockResolvedValue(complexTraditionalPolicy);

      const result = await accessControl.createPolicy(complexTraditionalPolicy);

      expect(mockRepository.createPolicy).toHaveBeenCalledWith(complexTraditionalPolicy);
      expect(result).toEqual(complexTraditionalPolicy);
    });
  });

  describe('Builder Pattern Integration', () => {
    it('should accept PolicyBuilder instances and convert them to Policy objects', async () => {
      const policyBuilder = new PolicyBuilder('builder-policy')
        .version('2023-11-15')
        .allow(['read', 'write'])
        .on(['document/*'])
        .when({ department: 'engineering' });

      const expectedPolicy: Policy = {
        id: 'builder-policy',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read', 'write'],
              Resource: ['document/*'],
              Condition: { department: 'engineering' }
            }
          ]
        }
      };

      mockRepository.createPolicy.mockResolvedValue(expectedPolicy);

      const result = await accessControl.createPolicy(policyBuilder);

      expect(mockRepository.createPolicy).toHaveBeenCalledWith(expectedPolicy);
      expect(result).toEqual(expectedPolicy);
    });

    it('should handle complex builder policies with multiple statements', async () => {
      const policyBuilder = new PolicyBuilder('complex-builder')
        .version('2023-11-15')
        .statement(
          new StatementBuilder()
            .allow(['read', 'list'])
            .on(['document/*'])
            .when({ department: 'engineering' })
        )
        .statement(
          new StatementBuilder()
            .deny(['delete'])
            .on(['document/confidential/*'])
        );

      const expectedPolicy: Policy = {
        id: 'complex-builder',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read', 'list'],
              Resource: ['document/*'],
              Condition: { department: 'engineering' }
            },
            {
              Effect: Effect.Deny,
              Action: ['delete'],
              Resource: ['document/confidential/*']
            }
          ]
        }
      };

      mockRepository.createPolicy.mockResolvedValue(expectedPolicy);

      const result = await accessControl.createPolicy(policyBuilder);

      expect(mockRepository.createPolicy).toHaveBeenCalledWith(expectedPolicy);
      expect(result).toEqual(expectedPolicy);
    });

    it('should handle time-based builder policies', async () => {
      const policyBuilder = new PolicyBuilder('time-based-policy')
        .allow(['read', 'write'])
        .on(['project/*'])
        .activeFrom('2025-01-01T00:00:00Z')
        .activeUntil('2025-12-31T23:59:59Z');

      const expectedPolicy: Policy = {
        id: 'time-based-policy',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read', 'write'],
              Resource: ['project/*'],
              StartDate: '2025-01-01T00:00:00Z',
              EndDate: '2025-12-31T23:59:59Z'
            }
          ]
        }
      };

      mockRepository.createPolicy.mockResolvedValue(expectedPolicy);

      const result = await accessControl.createPolicy(policyBuilder);

      expect(mockRepository.createPolicy).toHaveBeenCalledWith(expectedPolicy);
      expect(result).toEqual(expectedPolicy);
    });
  });

  describe('Error Handling', () => {
    it('should propagate builder validation errors', async () => {
      const invalidBuilder = new PolicyBuilder('invalid-policy')
        .allow(['read']);
        // Missing .on() call - should cause validation error

      await expect(accessControl.createPolicy(invalidBuilder))
        .rejects
        .toThrow('Invalid policy configuration');
    });

    it('should handle repository errors for both traditional and builder approaches', async () => {
      const repositoryError = new Error('Database connection failed');
      mockRepository.createPolicy.mockRejectedValue(repositoryError);

      // Test with traditional policy
      const traditionalPolicy: Policy = {
        id: 'test-policy',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read'],
              Resource: ['document/*']
            }
          ]
        }
      };

      await expect(accessControl.createPolicy(traditionalPolicy))
        .rejects
        .toThrow('Database connection failed');

      // Test with builder policy
      const builderPolicy = new PolicyBuilder('test-policy-2')
        .allow(['read'])
        .on(['document/*']);

      await expect(accessControl.createPolicy(builderPolicy))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('Type Safety', () => {
    it('should provide proper TypeScript types for both approaches', async () => {
      // This test verifies that TypeScript compilation works correctly
      // The actual runtime behavior is tested in other tests

      // Traditional approach
      const traditionalPolicy: Policy = {
        id: 'type-test-1',
        document: {
          Version: '2023-11-15',
          Statement: []
        }
      };

      // Builder approach
      const builderPolicy: PolicyBuilder = new PolicyBuilder('type-test-2')
        .allow(['read'])
        .on(['document/*']);

      // Both should be accepted by createPolicy
      mockRepository.createPolicy.mockResolvedValue(traditionalPolicy);

      // Type check - both calls should compile without errors
      const result1 = accessControl.createPolicy(traditionalPolicy);
      const result2 = accessControl.createPolicy(builderPolicy);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support creating policies with both approaches in the same application', async () => {
      // Traditional approach for simple policies
      const simplePolicy: Policy = {
        id: 'simple-policy',
        document: {
          Version: '2023-11-15',
          Statement: [
            {
              Effect: Effect.Allow,
              Action: ['read'],
              Resource: ['public/*']
            }
          ]
        }
      };

      // Builder approach for complex policies
      const complexPolicy = new PolicyBuilder('complex-policy')
        .statement(
          new StatementBuilder()
            .allow(['read', 'write'])
            .on(['document/*'])
            .when({ department: 'engineering' })
            .activeFrom('2025-01-01T00:00:00Z')
        )
        .statement(
          new StatementBuilder()
            .deny(['delete'])
            .on(['document/production/*'])
        );

      mockRepository.createPolicy
        .mockResolvedValueOnce(simplePolicy)
        .mockResolvedValueOnce({
          id: 'complex-policy',
          document: {
            Version: '2023-11-15',
            Statement: complexPolicy.build().document.Statement
          }
        });

      const result1 = await accessControl.createPolicy(simplePolicy);
      const result2 = await accessControl.createPolicy(complexPolicy);

      expect(result1.id).toBe('simple-policy');
      expect(result2.id).toBe('complex-policy');
      expect(mockRepository.createPolicy).toHaveBeenCalledTimes(2);
    });
  });
});
