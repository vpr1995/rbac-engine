import {User, Role, Policy} from "./models";
import {IBaseRepository} from "./db/base-repo";
import { evaluate } from "./policy/evaluator";
import { createRepository } from "./db/factory";
import { PolicyBuilder } from "./builders";

/**
 * Type for repository constructor that creates repositories implementing IBaseRepository
 * This type represents a constructor function that takes a database client and
 * returns an implementation of the IBaseRepository interface.
 * @typedef {new <T>(client: T) => IBaseRepository} RepositoryConstructor<T>
 */
type RepositoryConstructor<T> = new (client: T) => IBaseRepository;

/**
 * AccessControl provides role-based access control functionality with policy evaluation
 * for managing permissions across an application.
 * 
 * This class handles creating and managing users, roles, and policies, as well as
 * evaluating access requests based on assigned permissions.
 * 
 * @example
 * // Import the necessary classes
 * import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
 * import { AccessControl, DynamoDBRepository } from "rbac-engine";
 * 
 * // Create your database client
 * const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
 * 
 * // Initialize with an explicit repository implementation
 * const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);
 */
export class AccessControl<T> {
    private repository: IBaseRepository;

    /**
     * Creates a new AccessControl instance
     * 
     * @param {T} client - The database client or connection information to use for persistence
     * @param {RepositoryConstructor<T>} repositoryConstructor - Constructor for the repository implementation
     * @example
     * // Using with DynamoDB repository
     * import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
     * import { AccessControl, DynamoDBRepository } from "rbac-engine";
     * 
     * const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
     * const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);
     * 
     * @example
     * // Using with a PostgreSQL repository
     * import { Pool } from "pg";
     * import { AccessControl, PostgresRepository } from "rbac-engine";
     * 
     * const pgPool = new Pool(pgConfig);
     * const accessControl = new AccessControl(pgPool, PostgresRepository);
     */
    constructor(client: T, repositoryConstructor: RepositoryConstructor<T>) {
        this.repository = createRepository(client, repositoryConstructor);
    }

    /**
     * Initializes the access control system by setting up required database tables
     * 
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        await this.repository.setupTables();
    }

    /**
     * Creates a new user in the system
     * 
     * @param user - User object containing user details
     * @returns Promise containing the created user with generated ID
     */
    async createUser(user: User): Promise<User> {
        return await this.repository.createUser(user);
    }

    /**
     * Creates a new role in the system
     * 
     * @param role - Role object containing role details
     * @returns Promise containing the created role with generated ID
     */
    async createRole(role: Role): Promise<Role> {
        return await this.repository.createRole(role);
    }

    /**
     * Assigns an existing role to an existing user
     * 
     * @param userId - ID of the user
     * @param roleId - ID of the role to assign
     * @returns Promise containing the updated user with new role assignment
     */
    async assignRoleToUser(userId: string, roleId: string): Promise<User> {
        return await this.repository.assignRoleToUser(userId, roleId);
    }

    /**
     * Creates a new policy in the system
     * Supports both traditional Policy objects and PolicyBuilder instances
     * 
     * @param policy - Policy object containing permission rules or PolicyBuilder instance
     * @returns Promise containing the created policy with generated ID
     * 
     * @example
     * // Traditional object approach (backward compatible)
     * const policy = await accessControl.createPolicy({
     *   id: 'policy-123',
     *   document: {
     *     Version: '2023-11-15',
     *     Statement: [...]
     *   }
     * });
     * 
     * @example
     * // New builder approach
     * const policy = await accessControl.createPolicy(
     *   new PolicyBuilder('policy-123')
     *     .allow(['read', 'write'])
     *     .on(['document/*'])
     * );
     */
    async createPolicy(policy: Policy | PolicyBuilder): Promise<Policy> {
        const policyObject = policy instanceof PolicyBuilder ? policy.build() : policy;
        return await this.repository.createPolicy(policyObject);
    }

    /**
     * Attaches an existing policy to an existing role
     * 
     * @param policyId - ID of the policy
     * @param roleId - ID of the role
     * @returns Promise that resolves when the attachment is complete
     */
    async attachPolicyToRole(policyId: string, roleId: string): Promise<void> {
        return await this.repository.attachPolicyToRole(policyId, roleId);
    }

    /**
     * Attaches an existing policy directly to an existing user
     * 
     * @param policyId - ID of the policy
     * @param userId - ID of the user
     * @returns Promise that resolves when the attachment is complete
     */
    async attachPolicyToUser(policyId: string, userId: string): Promise<void> {
        return await this.repository.attachPolicyToUser(policyId, userId);
    }

    /**
     * Retrieves a user by their ID
     * 
     * @param userId - ID of the user to retrieve
     * @returns Promise containing the user object
     */
    async getUser(userId: string): Promise<User> {
        return await this.repository.getUser(userId);
    }

    /**
     * Retrieves a role by its ID
     * 
     * @param roleId - ID of the role to retrieve
     * @returns Promise containing the role object
     */
    async getRole(roleId: string): Promise<Role> {
        return await this.repository.getRole(roleId);
    }

    /**
     * Retrieves all policies directly associated with a user
     * 
     * @param userId - ID of the user
     * @returns Promise containing an array of policies
     */
    async getUserPolicies(userId: string): Promise<Policy[]> {
        return await this.repository.getUserPolicies(userId);
    }

    /**
     * Retrieves all policies associated with a role
     * 
     * @param roleId - ID of the role
     * @returns Promise containing an array of policies
     */
    async getRolePolicies(roleId: string): Promise<Policy[]> {
        return await this.repository.getRolePolicies(roleId);
    }

    /**
     * Updates an existing role's details
     * 
     * @param role - Role object with updated information
     * @returns Promise containing the updated role
     */
    async updateRole(role: Role): Promise<Role> {
        return await this.repository.updateRole(role);
    }

    /**
     * Updates an existing policy's details
     * 
     * @param policy - Policy object with updated information
     * @returns Promise containing the updated policy
     */
    async updatePolicy(policy: Policy): Promise<Policy> {
        return await this.repository.updatePolicy(policy);
    }

    /**
     * Deletes a policy from the system
     * 
     * @param policyId - ID of the policy to delete
     * @returns Promise that resolves when the deletion is complete
     */
    async deletePolicy(policyId: string): Promise<void> {
        return await this.repository.deletePolicy(policyId);
    }

    /**
     * Deletes a role from the system
     * 
     * @param roleId - ID of the role to delete
     * @returns Promise that resolves when the deletion is complete
     */
    async deleteRole(roleId: string): Promise<void> {
        return await this.repository.deleteRole(roleId);
    }

    /**
     * Removes a policy from a role
     * 
     * @param policyId - ID of the policy to detach
     * @param roleId - ID of the role to detach from
     * @returns Promise that resolves when the detachment is complete
     */
    async detachPolicyFromRole(policyId: string, roleId: string): Promise<void> {
        return await this.repository.detachPolicyFromRole(policyId, roleId);
    }

    /**
     * Removes a policy from a user
     * 
     * @param policyId - ID of the policy to detach
     * @param userId - ID of the user to detach from
     * @returns Promise that resolves when the detachment is complete
     */
    async detachPolicyFromUser(policyId: string, userId: string): Promise<void> {
        return await this.repository.detachPolicyFromUser(policyId, userId);
    }

    /**
     * Removes a role from a user
     * 
     * @param userId - ID of the user
     * @param roleId - ID of the role to remove
     * @returns Promise that resolves when the removal is complete
     */
    async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        return await this.repository.removeRoleFromUser(userId, roleId);
    }

    /**
     * Determines if a user has permission to perform an action on a resource
     * 
     * This method evaluates all policies attached to the user directly and through
     * their assigned roles to determine if access should be granted.
     * 
     * @param userId - ID of the user requesting access
     * @param action - The action being performed (e.g., "read", "write")
     * @param resource - The resource being accessed (e.g., "document", "user")
     * @param context - Additional contextual information for policy evaluation
     * @returns Promise resolving to true if access is granted, false otherwise
     */
    async hasAccess(userId: string, action: string, resource: string, context: Record<string, any> = {}): Promise<boolean> {
        const user = await this.getUser(userId);
    
        const [getUserPolicies, rolePoliciesNested] = await Promise.all([
            this.getUserPolicies(userId),
            await Promise.all(
                (user.roles || []).map(roleId => this.getRolePolicies(roleId))
            )
        ]);

        const rolePolicies = rolePoliciesNested.flat();
        const allPolicies = [...getUserPolicies, ...rolePolicies];

        return evaluate(allPolicies, action, resource, context);
    }
}