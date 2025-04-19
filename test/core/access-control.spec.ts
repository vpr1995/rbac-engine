import { AccessControl } from '../../core';
import { Effect, User, Role, Policy } from '../../models';
import { evaluate } from '../../policy/evaluator';
import { IBaseRepository } from '../../db/base-repo';

// Mock the policy evaluator module
jest.mock('../../policy/evaluator', () => ({
  evaluate: jest.fn()
}));

// Mock the db factory module
jest.mock('../../db/factory', () => ({
  createRepository: jest.fn()
}));

describe('AccessControl', () => {
  // Create a mock repository that implements IBaseRepository
  const mockRepository: jest.Mocked<IBaseRepository> = {
    setupTables: jest.fn().mockResolvedValue(undefined),
    createUser: jest.fn(),
    getUser: jest.fn(),
    createRole: jest.fn(),
    getRole: jest.fn(),
    assignRoleToUser: jest.fn(),
    createPolicy: jest.fn(),
    attachPolicyToRole: jest.fn().mockResolvedValue(undefined),
    attachPolicyToUser: jest.fn().mockResolvedValue(undefined),
    getUserPolicies: jest.fn(),
    getRolePolicies: jest.fn(),
    updateRole: jest.fn(),
    updatePolicy: jest.fn(),
    deletePolicy: jest.fn().mockResolvedValue(undefined),
    deleteRole: jest.fn().mockResolvedValue(undefined),
    detachPolicyFromRole: jest.fn().mockResolvedValue(undefined),
    detachPolicyFromUser: jest.fn().mockResolvedValue(undefined),
    removeRoleFromUser: jest.fn().mockResolvedValue(undefined)
  };

  /**
   * Mock repository class that implements IBaseRepository
   * This is used to satisfy the new factory pattern which expects 
   * a constructor function that creates repository instances
   */
  class MockRepositoryClass implements IBaseRepository {
    /**
     * Constructor that matches the signature expected by the factory
     * @param _client - Database client (not used in tests)
     */
    constructor(_client: any) {
      // Do nothing with the client in the test
    }
    // Forward all method calls to the mockRepository object
    setupTables = mockRepository.setupTables;
    createUser = mockRepository.createUser;
    getUser = mockRepository.getUser;
    createRole = mockRepository.createRole;
    getRole = mockRepository.getRole;
    assignRoleToUser = mockRepository.assignRoleToUser;
    createPolicy = mockRepository.createPolicy;
    attachPolicyToRole = mockRepository.attachPolicyToRole;
    attachPolicyToUser = mockRepository.attachPolicyToUser;
    getUserPolicies = mockRepository.getUserPolicies;
    getRolePolicies = mockRepository.getRolePolicies;
    updateRole = mockRepository.updateRole;
    updatePolicy = mockRepository.updatePolicy;
    deletePolicy = mockRepository.deletePolicy;
    deleteRole = mockRepository.deleteRole;
    detachPolicyFromRole = mockRepository.detachPolicyFromRole;
    detachPolicyFromUser = mockRepository.detachPolicyFromUser;
    removeRoleFromUser = mockRepository.removeRoleFromUser;
  }

  // Mock the factory to return our mock repository
  const mockCreateRepository = require('../../db/factory').createRepository;
  mockCreateRepository.mockImplementation((_client: any, _repoConstructor: any) => mockRepository);

  const mockClient = { type: 'mock' };
  let accessControl: AccessControl<any>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Initialize AccessControl with the mock client and mock repository constructor
    // The explicit repository constructor is needed for testing, in real usage it's optional
    accessControl = new AccessControl<any>(mockClient, MockRepositoryClass);
  });

  describe('init', () => {
    it('should call setupTables on the repository', async () => {
      await accessControl.init();
      expect(mockRepository.setupTables).toHaveBeenCalledTimes(1);
    });
  });

  describe('createUser', () => {
    it('should create a user via the repository', async () => {
      const mockUser: User = { id: 'u1', name: 'Test User' };
      mockRepository.createUser.mockResolvedValue(mockUser);

      const result = await accessControl.createUser(mockUser);
      
      expect(mockRepository.createUser).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });
  });

  describe('createRole', () => {
    it('should create a role via the repository', async () => {
      const mockRole: Role = { id: 'r1', name: 'Admin' };
      mockRepository.createRole.mockResolvedValue(mockRole);

      const result = await accessControl.createRole(mockRole);
      
      expect(mockRepository.createRole).toHaveBeenCalledWith(mockRole);
      expect(result).toEqual(mockRole);
    });
  });

  describe('assignRoleToUser', () => {
    it('should assign a role to a user via the repository', async () => {
      const userId = 'u1';
      const roleId = 'r1';
      const updatedUser: User = { 
        id: userId, 
        name: 'Test User',
        roles: [roleId]
      };
      
      mockRepository.assignRoleToUser.mockResolvedValue(updatedUser);

      const result = await accessControl.assignRoleToUser(userId, roleId);
      
      expect(mockRepository.assignRoleToUser).toHaveBeenCalledWith(userId, roleId);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('createPolicy', () => {
    it('should create a policy via the repository', async () => {
      const mockPolicy: Policy = { 
        id: 'p1', 
        document: {
          Version: '2023-10-17',
          Statement: [{
            Effect: Effect.Allow,
            Action: ['read'],
            Resource: ['document']
          }]
        }
      };
      
      mockRepository.createPolicy.mockResolvedValue(mockPolicy);

      const result = await accessControl.createPolicy(mockPolicy);
      
      expect(mockRepository.createPolicy).toHaveBeenCalledWith(mockPolicy);
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('attachPolicyToRole', () => {
    it('should attach a policy to a role via the repository', async () => {
      const policyId = 'p1';
      const roleId = 'r1';
      
      await accessControl.attachPolicyToRole(policyId, roleId);
      
      expect(mockRepository.attachPolicyToRole).toHaveBeenCalledWith(policyId, roleId);
    });
  });

  describe('getUser', () => {
    it('should retrieve a user via the repository', async () => {
      const userId = 'u1';
      const mockUser: User = { id: userId, name: 'Test User' };
      
      mockRepository.getUser.mockResolvedValue(mockUser);

      const result = await accessControl.getUser(userId);
      
      expect(mockRepository.getUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });
  });

  describe('getRole', () => {
    it('should retrieve a role via the repository', async () => {
      const roleId = 'r1';
      const mockRole: Role = { id: roleId, name: 'Admin' };
      
      mockRepository.getRole.mockResolvedValue(mockRole);

      const result = await accessControl.getRole(roleId);
      
      expect(mockRepository.getRole).toHaveBeenCalledWith(roleId);
      expect(result).toEqual(mockRole);
    });
  });

  describe('getUserPolicies', () => {
    it('should retrieve user policies via the repository', async () => {
      const userId = 'u1';
      const mockPolicies: Policy[] = [
        { 
          id: 'p1', 
          document: {
            Version: '2023-10-17',
            Statement: [{
              Effect: Effect.Allow,
              Action: ['read'],
              Resource: ['document']
            }]
          }
        }
      ];
      
      mockRepository.getUserPolicies.mockResolvedValue(mockPolicies);

      const result = await accessControl.getUserPolicies(userId);
      
      expect(mockRepository.getUserPolicies).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockPolicies);
    });
  });

  describe('hasAccess', () => {
    it('should evaluate policies from user and roles to determine access', async () => {
      const userId = 'u1';
      const action = 'read';
      const resource = 'document';
      const context = { department: 'engineering' };
      
      const user: User = { id: userId, name: 'Test User', roles: ['r1', 'r2'] };
      const userPolicies: Policy[] = [
        { 
          id: 'p1', 
          document: {
            Version: '2023-10-17',
            Statement: [{
              Effect: Effect.Allow,
              Action: ['read'],
              Resource: ['document']
            }]
          }
        }
      ];
      
      const role1Policies: Policy[] = [
        { 
          id: 'p2', 
          document: {
            Version: '2023-10-17',
            Statement: [{
              Effect: Effect.Allow,
              Action: ['write'],
              Resource: ['document']
            }]
          }
        }
      ];
      
      const role2Policies: Policy[] = [
        { 
          id: 'p3', 
          document: {
            Version: '2023-10-17',
            Statement: [{
              Effect: Effect.Deny,
              Action: ['delete'],
              Resource: ['document']
            }]
          }
        }
      ];
      
      mockRepository.getUser.mockResolvedValue(user);
      mockRepository.getUserPolicies.mockResolvedValue(userPolicies);
      mockRepository.getRolePolicies
        .mockResolvedValueOnce(role1Policies)
        .mockResolvedValueOnce(role2Policies);
      
      // Mock the evaluate function to return true
      (evaluate as jest.Mock).mockReturnValue(true);
      
      const result = await accessControl.hasAccess(userId, action, resource, context);
      
      expect(mockRepository.getUser).toHaveBeenCalledWith(userId);
      expect(mockRepository.getUserPolicies).toHaveBeenCalledWith(userId);
      expect(mockRepository.getRolePolicies).toHaveBeenCalledWith('r1');
      expect(mockRepository.getRolePolicies).toHaveBeenCalledWith('r2');
      
      // Verify evaluate was called with all policies combined
      expect(evaluate).toHaveBeenCalledWith(
        [...userPolicies, ...role1Policies, ...role2Policies],
        action,
        resource,
        context
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false when evaluate returns false', async () => {
      const userId = 'u1';
      const user: User = { id: userId, name: 'Test User', roles: [] };
      const userPolicies: Policy[] = [];
      
      mockRepository.getUser.mockResolvedValue(user);
      mockRepository.getUserPolicies.mockResolvedValue(userPolicies);
      
      // Mock the evaluate function to return false
      (evaluate as jest.Mock).mockReturnValue(false);
      
      const result = await accessControl.hasAccess(userId, 'read', 'document');
      
      expect(evaluate).toHaveBeenCalledWith([], 'read', 'document', {});
      expect(result).toBe(false);
    });
  });

  describe('updateRole', () => {
    it('should update a role via the repository', async () => {
      const mockRole: Role = { id: 'r1', name: 'Updated Admin' };
      mockRepository.updateRole.mockResolvedValue(mockRole);

      const result = await accessControl.updateRole(mockRole);
      
      expect(mockRepository.updateRole).toHaveBeenCalledWith(mockRole);
      expect(result).toEqual(mockRole);
    });
  });

  describe('updatePolicy', () => {
    it('should update a policy via the repository', async () => {
      const mockPolicy: Policy = { 
        id: 'p1', 
        document: {
          Version: '2023-10-17',
          Statement: [{
            Effect: Effect.Allow,
            Action: ['read', 'write'],
            Resource: ['document']
          }]
        }
      };
      
      mockRepository.updatePolicy.mockResolvedValue(mockPolicy);

      const result = await accessControl.updatePolicy(mockPolicy);
      
      expect(mockRepository.updatePolicy).toHaveBeenCalledWith(mockPolicy);
      expect(result).toEqual(mockPolicy);
    });
  });

  describe('deletePolicy', () => {
    it('should delete a policy via the repository', async () => {
      const policyId = 'p1';
      
      await accessControl.deletePolicy(policyId);
      
      expect(mockRepository.deletePolicy).toHaveBeenCalledWith(policyId);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role via the repository', async () => {
      const roleId = 'r1';
      
      await accessControl.deleteRole(roleId);
      
      expect(mockRepository.deleteRole).toHaveBeenCalledWith(roleId);
    });
  });

  describe('detachPolicyFromRole', () => {
    it('should detach a policy from a role via the repository', async () => {
      const policyId = 'p1';
      const roleId = 'r1';
      
      await accessControl.detachPolicyFromRole(policyId, roleId);
      
      expect(mockRepository.detachPolicyFromRole).toHaveBeenCalledWith(policyId, roleId);
    });
  });

  describe('detachPolicyFromUser', () => {
    it('should detach a policy from a user via the repository', async () => {
      const policyId = 'p1';
      const userId = 'u1';
      
      await accessControl.detachPolicyFromUser(policyId, userId);
      
      expect(mockRepository.detachPolicyFromUser).toHaveBeenCalledWith(policyId, userId);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove a role from a user via the repository', async () => {
      const userId = 'u1';
      const roleId = 'r1';
      
      await accessControl.removeRoleFromUser(userId, roleId);
      
      expect(mockRepository.removeRoleFromUser).toHaveBeenCalledWith(userId, roleId);
    });
  });
});