# Access Control Library

A flexible and powerful role-based access control (RBAC) system with policy-based permissions for Node.js applications. This library provides a robust way to manage permissions across your application, inspired by AWS IAM.

## Features

- **Role-Based Access Control**: Assign roles to users and define permissions at the role level
- **Policy-Based Permissions**: Create detailed policies using JSON format
- **Flexible Permissions**: Support for wildcard patterns and conditional access
- **DynamoDB Integration**: Built-in support for Amazon DynamoDB
- **Extensible Architecture**: Easily extend to support other database systems

## Installation

```bash
npm install access-control
```

## Dependencies

- Node.js 16.0.0 or higher
- For DynamoDB support:
  - @aws-sdk/client-dynamodb
  - @aws-sdk/lib-dynamodb

## Quick Start

### 1. Initialize the Access Control System

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AccessControl } from "access-control";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

// Initialize the access control system
const accessControl = new AccessControl(dynamoClient);

// Create necessary tables
await accessControl.init();
```

### 2. Create Roles

```typescript
// Create admin role
const adminRole = await accessControl.createRole({
  id: "role-admin-123",  // Or use UUID: uuidv4()
  name: "Admin"
});

// Create editor role
const editorRole = await accessControl.createRole({
  id: "role-editor-456",
  name: "Editor"
});
```

### 3. Define Policies

```typescript
import { Effect, PolicyDocument } from "access-control";

// Admin policy - can do everything
const adminPolicyDocument: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["*"],
      Resource: ["*"]
    }
  ]
};

// Create the policy
const adminPolicy = await accessControl.createPolicy({
  id: "policy-admin-123",
  document: adminPolicyDocument
});

// Editor policy - can only read, create and update
const editorPolicyDocument: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["read", "create", "update"],
      Resource: ["document/*"]
    }
  ]
};

const editorPolicy = await accessControl.createPolicy({
  id: "policy-editor-456",
  document: editorPolicyDocument
});
```

### 4. Attach Policies to Roles

```typescript
await accessControl.attachPolicyToRole(adminPolicy.id, adminRole.id);
await accessControl.attachPolicyToRole(editorPolicy.id, editorRole.id);
```

### 5. Create Users and Assign Roles

```typescript
// Create users
const adminUser = await accessControl.createUser({
  id: "user-admin-123",
  name: "Admin User"
});

const editorUser = await accessControl.createUser({
  id: "user-editor-456",
  name: "Editor User"
});

// Assign roles to users
await accessControl.assignRoleToUser(adminUser.id, adminRole.id);
await accessControl.assignRoleToUser(editorUser.id, editorRole.id);
```

### 6. Check Permissions

```typescript
// Check if admin can delete documents
const adminCanDelete = await accessControl.hasAccess(
  adminUser.id,
  "delete",
  "document/123"
);
console.log(`Admin can delete document: ${adminCanDelete}`); // true

// Check if editor can update documents
const editorCanUpdate = await accessControl.hasAccess(
  editorUser.id,
  "update",
  "document/123"
);
console.log(`Editor can update document: ${editorCanUpdate}`); // true

// Check if editor can delete documents
const editorCanDelete = await accessControl.hasAccess(
  editorUser.id,
  "delete",
  "document/123"
);
console.log(`Editor can delete document: ${editorCanDelete}`); // false
```

## Core Concepts

### Users

A User represents an individual accessing your system. Users can have roles assigned to them and policies attached directly.

```typescript
export interface User {
    id: string;
    name: string;
    roles?: string[];
    policies?: string[];
}
```

### Roles

Roles are collections of permissions that can be assigned to users. Assigning roles to users makes permission management easier as multiple users can share the same role.

```typescript
export interface Role {
    id: string;
    name: string;
    policies?: string[];
}
```

### Policies

Policies define what actions are allowed or denied on what resources. Each policy contains one or more statements that specify the permissions.

```typescript
export interface Policy {
    id: string;
    document: PolicyDocument;
}

export interface PolicyDocument {
    Version: string;
    Statement: PolicyStatement[];
}

export interface PolicyStatement {
    Effect: Effect; // 'Allow' or 'Deny'
    Action: string[]; // Actions to allow/deny
    Resource: string[]; // Resources on which actions are allowed/denied
    Condition?: Record<string, any>; // Optional conditions
}

export enum Effect {
    Allow = 'Allow',
    Deny = 'Deny'
}
```

## Advanced Features

### Wildcard Support

You can use wildcards in both Action and Resource fields:

```typescript
const policyDocument: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["read*"], // Matches read, readAll, readOne, etc.
      Resource: ["document/*"] // Matches all documents
    }
  ]
};
```

### Conditional Access

Add conditions to your policies to provide even more granular control:

```typescript
const conditionalPolicy: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["read"],
      Resource: ["sensitive-document/*"],
      Condition: { department: "finance" }
    }
  ]
};

// Check if user can access with a specific context
const canAccess = await accessControl.hasAccess(
  userId,
  "read",
  "sensitive-document/budget",
  { department: "finance" } // Only users with finance department can access
);
```

## API Reference

### AccessControl

The main class for all access control operations.

#### Constructor

```typescript
constructor(client: unknown)
```

- `client`: Database client (e.g., DynamoDBClient)

#### Methods

```typescript
// Initialization
async init(): Promise<void>

// User Management
async createUser(user: User): Promise<User>
async getUser(userId: string): Promise<User>

// Role Management
async createRole(role: Role): Promise<Role>
async getRole(roleId: string): Promise<Role>
async updateRole(role: Role): Promise<Role>
async deleteRole(roleId: string): Promise<void>

// Role Assignment
async assignRoleToUser(userId: string, roleId: string): Promise<User>
async removeRoleFromUser(userId: string, roleId: string): Promise<void>

// Policy Management
async createPolicy(policy: Policy): Promise<Policy>
async updatePolicy(policy: Policy): Promise<Policy>
async deletePolicy(policyId: string): Promise<void>

// Policy Attachment
async attachPolicyToRole(policyId: string, roleId: string): Promise<void>
async attachPolicyToUser(policyId: string, userId: string): Promise<void>
async detachPolicyFromRole(policyId: string, roleId: string): Promise<void>
async detachPolicyFromUser(policyId: string, userId: string): Promise<void>

// Policy Retrieval
async getUserPolicies(userId: string): Promise<Policy[]>
async getRolePolicies(roleId: string): Promise<Policy[]>

// Access Control
async hasAccess(userId: string, action: string, resource: string, context?: Record<string, any>): Promise<boolean>
```

## Complete Example

See the [examples/dynamodb-basic.ts](examples/dynamodb-basic.ts) file for a complete working example.

## Extending the Library

### Supporting Other Databases

You can extend the library to work with other databases by:

1. Implementing the `IBaseRepository` interface
2. Registering your implementation with the factory

```typescript
import { extendRepositoryMap } from "access-control";

// Example for PostgreSQL
import { Pool } from "pg";
import { PostgresRepository } from "./my-postgres-repo";

// Register your repository
extendRepositoryMap(Pool, PostgresRepository);

// Then use it
const pgPool = new Pool(pgConfig);
const accessControl = new AccessControl(pgPool);
```

## NPM Package Information

This package is available on npm and can be installed using npm or yarn:

```bash
npm install access-control
```

The package works with Node.js 16.0.0 and above.

## Best Practices

1. **Use UUIDs for IDs**: Generate unique IDs for users, roles, and policies using a library like `uuid`
2. **Design Fine-grained Permissions**: Create specific policies rather than overly broad ones
3. **Principle of Least Privilege**: Give users the minimum permissions needed to perform their tasks
4. **Separate Roles by Function**: Create roles based on job functions or responsibilities
5. **Audit Regularly**: Periodically review role assignments and permissions

## License

MIT

## Author

Prudhvi Reddy Vemireddy
