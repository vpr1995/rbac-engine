import { User, Role, Policy } from "../models";

export interface IBaseRepository {
    createUser(user: User): Promise<User>;
    getUser(id: string): Promise<User>;
    createRole(role: Role): Promise<Role>;
    getRole(id: string): Promise<Role>;
    assignRoleToUser(userId: string, roleId: string): Promise<User>;
    createPolicy(policy: Policy): Promise<Policy>;
    attachPolicyToRole(policyId: string, roleId: string): Promise<void>;
    attachPolicyToUser(policyId: string, userId: string): Promise<void>;
    getUserPolicies(userId: string): Promise<Policy[]>;
    getRolePolicies(roleId: string): Promise<Policy[]>;
    setupTables(): Promise<void>;
    updateRole(role: Role): Promise<Role>;
    updatePolicy(policy: Policy): Promise<Policy>;
    deletePolicy(policyId: string): Promise<void>;
    deleteRole(roleId: string): Promise<void>;
    detachPolicyFromRole(policyId: string, roleId: string): Promise<void>;
    detachPolicyFromUser(policyId: string, userId: string): Promise<void>;
    removeRoleFromUser(userId: string, roleId: string): Promise<void>;
}