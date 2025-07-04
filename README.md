# RBAC Engine

A flexible and powerful role-based access control (RBAC) system with policy-based permissions for Node.js applications. This library provides a robust way to manage permissions across your application, inspired by AWS IAM.

## Features

- **Role-Based Access Control**: Assign roles to users and define permissions at the role level
- **Policy-Based Permissions**: Create detailed policies using JSON format
- **Flexible Permissions**: Support for wildcard patterns and conditional access
- **Time-Based Policies**: Define policies with start and end dates for temporary access
- **DynamoDB Integration**: Built-in support for Amazon DynamoDB
- **Extensible Architecture**: Easily extend to support other database systems


## Table of Contents

- [Installation](#installation)
- [Dependencies](#dependencies)
- [Quick Start](#quick-start)
- [Builder Pattern API](#builder-pattern-api)
- [Core Concepts](#core-concepts)
- [Advanced Features](#advanced-features)
- [Examples](#examples)
- [API Reference](#api-reference)
- [Extending the Library](#extending-the-library)

## Installation

```bash
npm install rbac-engine
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
import { AccessControl, DynamoDBRepository } from "rbac-engine";

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

// Initialize the access control system with DynamoDB repository
const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);

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
import { Effect, PolicyDocument } from "rbac-engine";

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

#### Alternative: Using Builder Pattern

You can also create policies using the fluent builder pattern:

```typescript
import { PolicyBuilder, StatementBuilder } from 'rbac-engine';

// Admin policy using builder pattern
const adminPolicy = await accessControl.createPolicy(
  new PolicyBuilder('policy-admin-123')
    .version('2023-11-15')
    .allow(['*'])
    .on(['*'])
);

// Editor policy with multiple statements using builder pattern
const editorPolicy = await accessControl.createPolicy(
  new PolicyBuilder('policy-editor-456')
    .version('2023-11-15')
    .statement(
      new StatementBuilder()
        .allow(['read', 'create', 'update'])
        .on(['document/*'])
    )
    .statement(
      new StatementBuilder()
        .deny(['delete'])
        .on(['document/critical/*'])
    )
);
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
    StartDate?: string; // Optional ISO format date string for when the policy becomes active (UTC)
    EndDate?: string; // Optional ISO format date string for when the policy expires (UTC)
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

### Time-Based Policies

Create policies that are only active during specific time periods by setting optional `StartDate` and/or `EndDate` fields. This is useful for temporary access grants, seasonal permissions, or scheduled policy changes.

Dates should be provided in ISO format strings and are interpreted as UTC timestamps:

```typescript
const temporaryAccessPolicy: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["read", "update"],
      Resource: ["project/quarterly-report"],
      StartDate: "2025-01-01T00:00:00Z", // Active from January 1st, 2025
      EndDate: "2025-03-31T23:59:59Z"    // Until March 31st, 2025
    }
  ]
};

// This policy will only grant access during Q1 2025
// Outside that date range, permissions will not be granted even if the policy is attached
```

You can combine time-based constraints with conditions for even more granular control:

```typescript
const contractorPolicy: PolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: Effect.Allow,
      Action: ["read", "update"],
      Resource: ["project/*"],
      Condition: { contractorId: "C12345" },
      StartDate: "2025-01-01T00:00:00Z", // Contract start date
      EndDate: "2025-06-30T23:59:59Z"    // Contract end date
    }
  ]
};
```

## API Reference

### AccessControl

The main class for all access control operations.

#### Constructor

```typescript
constructor(client: T, repositoryConstructor: RepositoryConstructor<T>)
```

- `client`: Database client (e.g., DynamoDBClient)
- `repositoryConstructor`: Constructor for the repository implementation (e.g., DynamoDBRepository)

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

## Builder Pattern API

The RBAC Engine supports both traditional object-based policy creation and a modern builder pattern API. The builder pattern provides a fluent, intuitive way to create policies while maintaining full backward compatibility.

### PolicyBuilder

Use `PolicyBuilder` for creating policies with a fluent API:

```typescript
import { PolicyBuilder, StatementBuilder } from 'rbac-engine';

// Simple single-statement policy
const simplePolicy = new PolicyBuilder('read-documents')
  .version('2023-11-15')
  .allow(['read', 'list'])
  .on(['document/*'])
  .when({ department: 'engineering' })
  .build();

// Complex multi-statement policy
const complexPolicy = new PolicyBuilder('complex-permissions')
  .version('2023-11-15')
  .statement(
    new StatementBuilder()
      .allow(['read', 'write'])
      .on(['project/*'])
      .when({ role: 'developer' })
      .activeFrom('2025-01-01T00:00:00Z')
      .activeUntil('2025-12-31T23:59:59Z')
  )
  .statement(
    new StatementBuilder()
      .deny(['delete'])
      .on(['project/production/*'])
  )
  .build();
```

### StatementBuilder

Create individual policy statements with the `StatementBuilder`:

```typescript
import { StatementBuilder } from 'rbac-engine';

const statement = new StatementBuilder()
  .allow(['read', 'write'])  // or .deny(['delete'])
  .on(['resource/*'])        // Resources to apply to
  .when({ dept: 'eng' })     // Optional conditions
  .activeFrom('2025-01-01T00:00:00Z')  // Optional start date
  .activeUntil('2025-12-31T23:59:59Z') // Optional end date
  .build();
```

### Builder Methods

#### PolicyBuilder Methods
- `version(version: string)` - Set the policy document version
- `allow(actions: string[])` - Add an allow statement (simple mode)
- `deny(actions: string[])` - Add a deny statement (simple mode)
- `on(resources: string[])` - Set resources for simple mode statement
- `when(conditions: object)` - Set conditions for simple mode statement
- `activeFrom(date: string)` - Set start date for simple mode statement
- `activeUntil(date: string)` - Set end date for simple mode statement
- `statement(statement: StatementBuilder)` - Add a statement (complex mode)
- `addStatements(statements: StatementBuilder[])` - Add multiple statements
- `build()` - Build and validate the final Policy object

#### StatementBuilder Methods
- `allow(actions: string[])` - Set effect to Allow with actions
- `deny(actions: string[])` - Set effect to Deny with actions
- `on(resources: string[])` - Set resources
- `when(conditions: object)` - Set conditions
- `activeFrom(date: string)` - Set start date
- `activeUntil(date: string)` - Set end date
- `build()` - Build and validate the final PolicyStatement

### Integration with AccessControl

The `AccessControl.createPolicy()` method accepts both `Policy` objects and `PolicyBuilder` instances:

```typescript
// Traditional approach (still fully supported)
const traditionalPolicy: Policy = {
  id: 'traditional-policy',
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

// Builder approach
const builderPolicy = new PolicyBuilder('builder-policy')
  .allow(['read'])
  .on(['document/*']);

// Both work with AccessControl
await accessControl.createPolicy(traditionalPolicy);
await accessControl.createPolicy(builderPolicy);
```

### Validation

Builder validation occurs only when calling `.build()`, providing detailed error messages:

```typescript
try {
  const policy = new PolicyBuilder('invalid-policy')
    .allow(['read'])
    // Missing .on() call
    .build();
} catch (error) {
  console.log(error.message); // "Invalid policy configuration"
  console.log(error.details);  // Array of specific validation errors
}
```

## Complete Examples

The RBAC Engine comes with comprehensive examples demonstrating all features:

### **📋 Comprehensive Example** (Recommended)
See [examples/comprehensive-example.ts](examples/comprehensive-example.ts) for a complete demonstration of all library features including:
- Basic RBAC setup with roles, policies, and users
- Traditional vs Builder Pattern approaches
- Time-based policies with date constraints
- Conditional access with context
- Wildcard patterns and complex permissions
- Direct policy attachment to users
- Advanced multi-statement policies

## Extending the Library

### Creating Custom Repository Implementations

You can extend the library to work with other databases by implementing the `IBaseRepository` interface:

1. Create a new repository class that implements the `IBaseRepository` interface
2. Pass your custom repository constructor to the AccessControl constructor

```typescript
import { AccessControl, IBaseRepository } from "rbac-engine";
import { Pool } from "pg";

// Example for PostgreSQL
class PostgresRepository implements IBaseRepository {
  constructor(private pool: Pool) {
    // Initialize your repository with the database connection
  }
  
  // Implement all required methods from IBaseRepository interface
  async createUser(user: User): Promise<User> {
    // PostgreSQL implementation
  }
  
  // ... implement all other required methods
}

// Then use it
const pgPool = new Pool(pgConfig);
const accessControl = new AccessControl(pgPool, PostgresRepository);
```

## NPM Package Information

This package is available on npm and can be installed using npm or yarn:

```bash
npm install rbac-engine
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
