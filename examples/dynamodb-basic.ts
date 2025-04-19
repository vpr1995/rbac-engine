import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AccessControl, Effect, PolicyDocument } from "../index";
import { v4 as uuidv4 } from "uuid";

const dynamoClient = new DynamoDBClient({
    region: "us-east-1",
});

const accessControl = new AccessControl(dynamoClient);

async function run() {
    try {
        console.log("Setting up tables...");
        await accessControl.init();

        const adminRoleId = uuidv4();
        const editorRoleId = uuidv4();
        const viewerRoleId = uuidv4();
        const adminPolicyId = uuidv4();
        const editorPolicyId = uuidv4();
        const viewerPolicyId = uuidv4();

        // Create roles
        console.log("Creating roles...");
        await accessControl.createRole({
            id: adminRoleId,
            name: "Admin"
        });

        await accessControl.createRole({
            id: editorRoleId,
            name: "Editor"
        });

        await accessControl.createRole({
            id: viewerRoleId,
            name: "Viewer"
        });

        // Create policies
        console.log("Creating policies...");

        // Admin policy - can do everything
        const adminPolicyDocument: PolicyDocument = {
            Version: "2023-11-15", // this can be anything, but we use a date for clarity
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["*"],
                    Resource: ["*"]
                }
            ]
        };

        await accessControl.createPolicy({
            id: adminPolicyId,
            document: adminPolicyDocument
        });

        // Editor policy - can create and edit documents
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

        await accessControl.createPolicy({
            id: editorPolicyId,
            document: editorPolicyDocument
        });

        // Viewer policy - can only read documents
        const viewerPolicyDocument: PolicyDocument = {
            Version: "2023-11-15",
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["read"],
                    Resource: ["document/*"]
                }
            ]
        };

        await accessControl.createPolicy({
            id: viewerPolicyId,
            document: viewerPolicyDocument
        });

        // Attach policies to roles
        console.log("Attaching policies to roles...");
        await accessControl.attachPolicyToRole(adminPolicyId, adminRoleId);
        await accessControl.attachPolicyToRole(editorPolicyId, editorRoleId);
        await accessControl.attachPolicyToRole(viewerPolicyId, viewerRoleId);

        // Create users
        console.log("Creating users...");
        const adminUser = await accessControl.createUser({
            id: uuidv4(),
            name: "Admin User"
        });

        const editorUser = await accessControl.createUser({
            id: uuidv4(),
            name: "Editor User"
        });

        const viewerUser = await accessControl.createUser({
            id: uuidv4(),
            name: "Viewer User"
        });

        // Assign roles to users
        console.log("Assigning roles to users...");
        await accessControl.assignRoleToUser(adminUser.id, adminRoleId);
        await accessControl.assignRoleToUser(editorUser.id, editorRoleId);
        await accessControl.assignRoleToUser(viewerUser.id, viewerRoleId);

        // Test access control
        console.log("Testing access control...");

        // Admin should have all access
        const adminCanCreate = await accessControl.hasAccess(adminUser.id, "create", "document/123");
        console.log(`Admin can create document: ${adminCanCreate}`);

        const adminCanDelete = await accessControl.hasAccess(adminUser.id, "delete", "document/123");
        console.log(`Admin can delete document: ${adminCanDelete}`);

        // Editor can create, read and update but not delete
        const editorCanCreate = await accessControl.hasAccess(editorUser.id, "create", "document/123");
        console.log(`Editor can create document: ${editorCanCreate}`);

        const editorCanUpdate = await accessControl.hasAccess(editorUser.id, "update", "document/123");
        console.log(`Editor can update document: ${editorCanUpdate}`);

        const editorCanDelete = await accessControl.hasAccess(editorUser.id, "delete", "document/123");
        console.log(`Editor can delete document: ${editorCanDelete}`);

        // Viewer can only read
        const viewerCanRead = await accessControl.hasAccess(viewerUser.id, "read", "document/123");
        console.log(`Viewer can read document: ${viewerCanRead}`);

        const viewerCanUpdate = await accessControl.hasAccess(viewerUser.id, "update", "document/123");
        console.log(`Viewer can update document: ${viewerCanUpdate}`);

        // Test with conditions
        console.log("Testing with conditions...");

        // Create a policy with conditions
        const conditionalPolicyId = uuidv4();
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

        await accessControl.createPolicy({
            id: conditionalPolicyId,
            document: conditionalPolicy
        });

        // Attach to viewer role
        await accessControl.attachPolicyToRole(conditionalPolicyId, viewerRoleId);

        // Test with matching context
        const viewerFinanceContext = await accessControl.hasAccess(
            viewerUser.id,
            "read",
            "sensitive-document/budget",
            { department: "finance" }
        );
        console.log(`Viewer from finance can read sensitive document: ${viewerFinanceContext}`);

        // Test with non-matching context
        const viewerHRContext = await accessControl.hasAccess(
            viewerUser.id,
            "read",
            "sensitive-document/budget",
            { department: "hr" }
        );
        console.log(`Viewer from HR can read sensitive document: ${viewerHRContext}`);

        console.log("Example completed successfully!");

    } catch (error) {
        console.error("Error in example:", error);
    }
}

// Run the example
run();