import { IBaseRepository } from "./base-repo";
import { CreateTableCommand, CreateTableCommandInput, DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Policy, Role, User } from "../models";

export class DynamoDBRepository implements IBaseRepository {
    private docClient: DynamoDBDocumentClient;
    private tableName: string;

    constructor(private client: DynamoDBClient) {
        this.docClient = DynamoDBDocumentClient.from(client);
        this.tableName = process.env.TABLE_NAME || 'Access-Control';
    }

    async setupTables(): Promise<void> {
        try {
            await this.client.send(new DescribeTableCommand({
                TableName: this.tableName
            }));
            console.log("Table already exists");
        } catch (err: any) {
            if (err.name === "ResourceNotFoundException") {
                const params: CreateTableCommandInput = {
                    TableName: this.tableName,
                    KeySchema: [
                        { AttributeName: "PK", KeyType: "HASH" },
                        { AttributeName: "SK", KeyType: "RANGE" }
                    ],
                    AttributeDefinitions: [
                        { AttributeName: "PK", AttributeType: "S" },
                        { AttributeName: "SK", AttributeType: "S" }
                    ],
                    BillingMode: "PAY_PER_REQUEST"
                }
                
                await this.client.send(new CreateTableCommand(params));
                console.log("Table created");
            } else {
                throw new Error(`Something went wrong: ${err}`);
            }
        }
    }

    async createUser(user: User): Promise<User> {
        const item = {
            PK: `USER#${user.id}`,
            SK: `USER#${user.id}`,
            type: "USER",
            name: user.name,
            roles: user.roles || [],
            policies: user.policies || []
        }

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));

        return user;
    }

    async getUser(userId: string): Promise<User> {
        try {
            const result = await this.docClient.send(new GetCommand({
                TableName: this.tableName,
                Key: {
                    PK: `USER#${userId}`,
                    SK: `USER#${userId}`
                },
            }));

            if (!result.Item) {
                throw new Error(`User not found: ${userId}`);
            }

            return {
                id: userId,
                name: result.Item.name,
                roles: result.Item.roles,
                policies: result.Item.policies
            }
        } catch (err) {
            throw new Error(`Something went wrong: ${err}`);
        }
    }

    async createRole(role: Role): Promise<Role> {
        const item = {
            PK: `ROLE#${role.id}`,
            SK: `ROLE#${role.id}`,
            type: "ROLE",
            name: role.name,
            policies: role.policies || []
        }

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));
        
        return role;
    }

    async getRole(roleId: string): Promise<Role> {
        try {
            const result = await this.docClient.send(new GetCommand({
                TableName: this.tableName,
                Key: {
                    PK: `ROLE#${roleId}`,
                    SK: `ROLE#${roleId}`
                },
            }));

            if (!result.Item) {
                throw new Error(`Role not found: ${roleId}`);
            }

            return {
                id: roleId,
                name: result.Item.name,
                policies: result.Item.policies
            }
        } catch (err) {
            throw new Error(`Something went wrong: ${err}`);
        }
    }

    async assignRoleToUser(userId: string, roleId: string): Promise<User> {
        const user = await this.getUser(userId);

        if (!user.roles) {
            user.roles = [];
        }

        const roles = new Set(user.roles);
        roles.add(roleId);
        const updatedRoles = Array.from(roles);

        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `USER#${userId}`,
                SK: `USER#${userId}`
            },
            UpdateExpression: "SET #rolesAttr = :roles",
            ExpressionAttributeNames: {
                "#rolesAttr": "roles"
            },
            ExpressionAttributeValues: {
                ":roles": updatedRoles
            }
        }));

        return user;
    }

    async createPolicy(policy: Policy): Promise<Policy> {
        const item = {
            PK: `POLICY#${policy.id}`,
            SK: `POLICY#${policy.id}`,
            type: "POLICY",
            document: policy.document
        }

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));
        
        return policy;
    }

    async attachPolicyToRole(policyId: string, roleId: string): Promise<void> {
        const role = await this.getRole(roleId);

        if (!role.policies) {
            role.policies = [];
        }

        const policies = new Set(role.policies);
        policies.add(policyId);
        const updatedPolicies = Array.from(policies);

        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `ROLE#${roleId}`,
                SK: `ROLE#${roleId}`
            },
            UpdateExpression: "SET #policiesAttr = :policies",
            ExpressionAttributeNames: {
                "#policiesAttr": "policies"
            },
            ExpressionAttributeValues: {
                ":policies": updatedPolicies
            }
        }));
    }

    async getUserPolicies(userId: string): Promise<Policy[]> {
        const user = await this.getUser(userId);
        const policies: Policy[] = [];

        if (user.policies) {
            for (const policyId of user.policies) {
                const policy = await this.getPolicy(policyId);
                policies.push(policy);
            }
        }

        return policies;
    }

    async getRolePolicies(roleId: string): Promise<Policy[]> {
        const role = await this.getRole(roleId);
        const policies: Policy[] = [];

        if (role.policies) {
            for (const policyId of role.policies) {
                const policy = await this.getPolicy(policyId);
                policies.push(policy);
            }
        }

        return policies
    }

    async updateRole(role: Role): Promise<Role> {
        const item = {
            PK: `ROLE#${role.id}`,
            SK: `ROLE#${role.id}`,
            type: "ROLE",
            name: role.name,
            policies: role.policies || []
        }

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));
        
        return role;
    }

    async updatePolicy(policy: Policy): Promise<Policy> {
        const item = {
            PK: `POLICY#${policy.id}`,
            SK: `POLICY#${policy.id}`,
            type: "POLICY",
            document: policy.document
        }

        await this.docClient.send(new PutCommand({
            TableName: this.tableName,
            Item: item
        }));
        
        return policy;
    }

    async deletePolicy(policyId: string): Promise<void> {
        await this.docClient.send(new DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: `POLICY#${policyId}`,
                SK: `POLICY#${policyId}`
            }
        }));
    }

    async deleteRole(roleId: string): Promise<void> {
        await this.docClient.send(new DeleteCommand({
            TableName: this.tableName,
            Key: {
                PK: `ROLE#${roleId}`,
                SK: `ROLE#${roleId}`
            }
        }));
    }

    async detachPolicyFromUser(policyId: string, userId: string): Promise<void> {
        const user = await this.getUser(userId);

        if (!user.policies) {
            return;
        }

        const policies = user.policies.filter(p => p !== policyId);
        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `USER#${userId}`,
                SK: `USER#${userId}`
            },
            UpdateExpression: "SET #policiesAttr = :policies",
            ExpressionAttributeNames: {
                "#policiesAttr": "policies"
            },
            ExpressionAttributeValues: {
                ":policies": policies
            },
        }));
    }

    async detachPolicyFromRole(policyId: string, roleId: string): Promise<void> {
        const role = await this.getRole(roleId);

        if (!role.policies) {
            return;
        }

        const policies = role.policies.filter(p => p !== policyId);
        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `ROLE#${roleId}`,
                SK: `ROLE#${roleId}`
            },
            UpdateExpression: "SET #policiesAttr = :policies",
            ExpressionAttributeNames: {
                "#policiesAttr": "policies"
            },
            ExpressionAttributeValues: {
                ":policies": policies
            },
        }));
    }

    async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
        const user = await this.getUser(userId);

        if (!user.roles) {
            return;
        }

        const roles = user.roles.filter(r => r !== roleId);
        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `USER#${userId}`,
                SK: `USER#${userId}`
            },
            UpdateExpression: "SET #rolesAttr = :roles",
            ExpressionAttributeNames: {
                "#rolesAttr": "roles"
            },
            ExpressionAttributeValues: {
                ":roles": roles
            },
        }));
    }

    async attachPolicyToUser(policyId: string, userId: string): Promise<void> {
        const user = await this.getUser(userId);

        if (!user.policies) {
            user.policies = [];
        }

        const policies = new Set(user.policies);
        policies.add(policyId);
        const updatedPolicies = Array.from(policies);

        await this.docClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: {
                PK: `USER#${userId}`,
                SK: `USER#${userId}`
            },
            UpdateExpression: "SET #policiesAttr = :policies",
            ExpressionAttributeNames: {
                "#policiesAttr": "policies"
            },
            ExpressionAttributeValues: {
                ":policies": updatedPolicies
            }
        }));
    }

    async getPolicy(policyId: string): Promise<Policy> {
        try {
            const result = await this.docClient.send(new GetCommand({
                TableName: this.tableName,
                Key: {
                    PK: `POLICY#${policyId}`,
                    SK: `POLICY#${policyId}`
                },
            }));

            if (!result.Item) {
                throw new Error(`Policy not found: ${policyId}`);
            }

            return {
                id: policyId,
                document: result.Item.document
            }
        } catch (err) {
            throw new Error(`Something went wrong: ${err}`);
        }
    }
}