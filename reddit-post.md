# [Show npm] I just published my first npm package: rbac-engine - A flexible RBAC system inspired by AWS IAM

Hello everyone! I'm excited to share my very first npm package: **rbac-engine**!

## What is it?

**rbac-engine** is a flexible and powerful role-based access control (RBAC) system with policy-based permissions for Node.js applications. I designed it to provide a robust way to manage permissions across applications, taking inspiration from AWS IAM's approach to access control.

## Key Features

- **Role-Based Access Control**: Easily assign roles to users and define permissions at the role level
- **Policy-Based Permissions**: Create detailed policies using a simple JSON format
- **Flexible Permissions**: Support for wildcard patterns and conditional access
- **DynamoDB Integration**: Built-in support for Amazon DynamoDB
- **Extensible Architecture**: Can be extended to support other database systems

## Why I built it

I found that many existing RBAC solutions were either too complex or too simplistic for my needs. I wanted something that had the flexibility of AWS IAM but was easier to integrate into Node.js applications. So I built this package to bridge that gap.

## Example Usage

Here's a quick example of how you'd use it:

```typescript
// Initialize
import { AccessControl, DynamoDBRepository } from "rbac-engine";
const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);

// Create a policy
const adminPolicyDocument = {
  Version: "2023-11-15",
  Statement: [
    {
      Effect: 'Allow',
      Action: ["*"],
      Resource: ["*"]
    }
  ]
};

// Create and assign roles
await accessControl.createRole({id: "admin-role", name: "Admin"});
await accessControl.createPolicy({id: "admin-policy", document: adminPolicyDocument});
await accessControl.attachPolicyToRole("admin-policy", "admin-role");
await accessControl.assignRoleToUser("user123", "admin-role");

// Check permissions
const canAccess = await accessControl.hasAccess("user123", "delete", "document/123");
```

## Installation

```bash
npm install rbac-engine
```

## Links

- [npm package](https://www.npmjs.com/package/rbac-engine)
- [GitHub repo](https://github.com/vpr1995/rbac-engine)

This is my first npm package, and I'd love to get your feedback! What do you think? Any suggestions for improvements?