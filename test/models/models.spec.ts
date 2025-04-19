import { User, Role, Policy, Effect, PolicyStatement, PolicyDocument } from '../../models';

describe('Models', () => {
  describe('User model', () => {
    it('should create a user with required properties', () => {
      const user: User = {
        id: 'user-123',
        name: 'John Doe'
      };
      
      expect(user.id).toBe('user-123');
      expect(user.name).toBe('John Doe');
      expect(user.roles).toBeUndefined();
      expect(user.policies).toBeUndefined();
    });
    
    it('should create a user with optional properties', () => {
      const user: User = {
        id: 'user-123',
        name: 'John Doe',
        roles: ['role-1', 'role-2'],
        policies: ['policy-1']
      };
      
      expect(user.id).toBe('user-123');
      expect(user.name).toBe('John Doe');
      expect(user.roles).toEqual(['role-1', 'role-2']);
      expect(user.policies).toEqual(['policy-1']);
    });
  });
  
  describe('Role model', () => {
    it('should create a role with required properties', () => {
      const role: Role = {
        id: 'role-123',
        name: 'Admin'
      };
      
      expect(role.id).toBe('role-123');
      expect(role.name).toBe('Admin');
      expect(role.policies).toBeUndefined();
    });
    
    it('should create a role with optional properties', () => {
      const role: Role = {
        id: 'role-123',
        name: 'Admin',
        policies: ['policy-1', 'policy-2']
      };
      
      expect(role.id).toBe('role-123');
      expect(role.name).toBe('Admin');
      expect(role.policies).toEqual(['policy-1', 'policy-2']);
    });
  });
  
  describe('Policy model', () => {
    it('should create a policy with valid structure', () => {
      const policyStatement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read', 'write'],
        Resource: ['document:*']
      };
      
      const policyDocument: PolicyDocument = {
        Version: '2023-10-17',
        Statement: [policyStatement]
      };
      
      const policy: Policy = {
        id: 'policy-123',
        document: policyDocument
      };
      
      expect(policy.id).toBe('policy-123');
      expect(policy.document.Version).toBe('2023-10-17');
      expect(policy.document.Statement).toHaveLength(1);
      expect(policy.document.Statement[0].Effect).toBe(Effect.Allow);
      expect(policy.document.Statement[0].Action).toEqual(['read', 'write']);
      expect(policy.document.Statement[0].Resource).toEqual(['document:*']);
    });
    
    it('should create a policy with condition', () => {
      const policyStatement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document:*'],
        Condition: { department: 'engineering' }
      };
      
      const policyDocument: PolicyDocument = {
        Version: '2023-10-17',
        Statement: [policyStatement]
      };
      
      const policy: Policy = {
        id: 'policy-123',
        document: policyDocument
      };
      
      expect(policy.document.Statement[0].Condition).toEqual({ department: 'engineering' });
    });
  });
  
  describe('Effect enum', () => {
    it('should have the correct values', () => {
      expect(Effect.Allow).toBe('Allow');
      expect(Effect.Deny).toBe('Deny');
    });
  });
});