import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AccessControl, Effect, PolicyBuilder, StatementBuilder } from "../index";
import { DynamoDBRepository } from "../db/dynamodb-repo";
import { v4 as uuidv4 } from "uuid";

/**
 * RBAC Engine - Streamlined Comprehensive Example
 * 
 * This example demonstrates all key features in a concise format:
 * • Basic RBAC setup (users, roles, policies)
 * • Traditional JSON vs Builder Pattern policies
 * • Time-based policies with date constraints
 * • Conditional access with context
 * • Direct user policy attachment
 * • Permission testing and validation
 */

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);

async function runComprehensiveExample() {
    try {
        console.log("🚀 RBAC Engine - Comprehensive Example");
        console.log("=".repeat(60));
        
        // Initialize
        await accessControl.init();
        console.log("✅ System initialized\n");

        // 1. Create roles and users
        const [adminRoleId, editorRoleId] = [uuidv4(), uuidv4()];
        await accessControl.createRole({ id: adminRoleId, name: "Admin" });
        await accessControl.createRole({ id: editorRoleId, name: "Editor" });
        
        const adminUser = await accessControl.createUser({ id: uuidv4(), name: "Admin User" });
        const editorUser = await accessControl.createUser({ id: uuidv4(), name: "Editor User" });
        const contractorUser = await accessControl.createUser({ id: uuidv4(), name: "Contractor User" });
        console.log("✓ Created users and roles");

        // 2. Create policies using different approaches
        
        // Traditional JSON approach
        const adminPolicyId = uuidv4();
        await accessControl.createPolicy({
            id: adminPolicyId,
            document: {
                Version: "2025-05-29",
                Statement: [{ Effect: Effect.Allow, Action: ["*"], Resource: ["*"] }]
            }
        });
        console.log("✓ Created admin policy (traditional JSON)");

        // Builder pattern with conditions
        const editorPolicy = await accessControl.createPolicy(
            new PolicyBuilder(`editor-${uuidv4()}`)
                .version("2025-05-29")
                .statement(
                    new StatementBuilder()
                        .allow(["read", "create", "update"])
                        .on(["document/*"])
                        .when({ department: "engineering" })
                )
                .statement(
                    new StatementBuilder()
                        .deny(["delete"])
                        .on(["document/critical/*"])
                )
        );
        console.log("✓ Created editor policy (builder pattern with conditions)");

        // Time-based policy with direct user attachment
        const contractorPolicy = await accessControl.createPolicy(
            new PolicyBuilder(`contractor-${uuidv4()}`)
                .version("2025-05-29")
                .allow(["read", "update"])
                .on(["project/temp/*"])
                .when({ contractorId: "C12345" })
                .activeFrom("2025-01-01T00:00:00Z")
                .activeUntil("2025-06-30T23:59:59Z")
        );
        await accessControl.attachPolicyToUser(contractorPolicy.id, contractorUser.id);
        console.log("✓ Created time-based contractor policy (direct user attachment)");

        // 3. Assign roles and policies
        await accessControl.attachPolicyToRole(adminPolicyId, adminRoleId);
        await accessControl.attachPolicyToRole(editorPolicy.id, editorRoleId);
        await accessControl.assignRoleToUser(adminUser.id, adminRoleId);
        await accessControl.assignRoleToUser(editorUser.id, editorRoleId);
        console.log("✓ Assigned roles and policies");

        // 4. Test permissions
        console.log("\n🧪 Permission Tests:");
        
        const adminCanDelete = await accessControl.hasAccess(adminUser.id, "delete", "document/123");
        console.log(`  Admin can delete: ${adminCanDelete ? "✅" : "❌"}`);

        const editorCanRead = await accessControl.hasAccess(
            editorUser.id, "read", "document/123", { department: "engineering" }
        );
        console.log(`  Editor can read (with context): ${editorCanRead ? "✅" : "❌"}`);

        const editorCannotRead = await accessControl.hasAccess(
            editorUser.id, "read", "document/123", { department: "hr" }
        );
        console.log(`  Editor cannot read (wrong context): ${!editorCannotRead ? "✅" : "❌"}`);

        const editorCannotDelete = await accessControl.hasAccess(
            editorUser.id, "delete", "document/critical/data"
        );
        console.log(`  Editor cannot delete critical: ${!editorCannotDelete ? "✅" : "❌"}`);

        const contractorCanAccess = await accessControl.hasAccess(
            contractorUser.id, "read", "project/temp/file", { contractorId: "C12345" }
        );
        console.log(`  Contractor time-based access: ${contractorCanAccess ? "✅" : "❌"}`);

        // 5. Validation example
        console.log("\n✅ Validation Example:");
        try {
            new PolicyBuilder(`invalid-${uuidv4()}`)
                .allow(["read"])
                // Missing .on() - validation error
                .build();
        } catch (error: any) {
            console.log(`✓ Caught validation error: ${error.message}`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    runComprehensiveExample()
        .then(() => console.log("\n🚀 Ready to use RBAC Engine!"))
        .catch(console.error);
}

export { runComprehensiveExample };
