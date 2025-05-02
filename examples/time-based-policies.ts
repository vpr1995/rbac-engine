import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AccessControl, Effect, PolicyDocument } from "../index";
import { DynamoDBRepository } from "../db/dynamodb-repo";
import { v4 as uuidv4 } from "uuid";

/**
 * This example demonstrates how to use time-based policies in the RBAC Engine library.
 * It shows how to create policies with StartDate and EndDate constraints and how these
 * affect access decisions based on the current time.
 */

// Create a DynamoDB client
const dynamoClient = new DynamoDBClient({
    region: "us-east-1",
});

// Initialize the access control system with DynamoDB repository
const accessControl = new AccessControl(dynamoClient, DynamoDBRepository);

async function run() {
    try {
        console.log("Setting up tables...");
        await accessControl.init();

        // Create a contractor role
        console.log("Creating contractor role...");
        const contractorRoleId = uuidv4();
        await accessControl.createRole({
            id: contractorRoleId,
            name: "Contractor"
        });

        // Create contractor user
        console.log("Creating contractor user...");
        const contractorUser = await accessControl.createUser({
            id: uuidv4(),
            name: "Temporary Contractor"
        });

        // Assign contractor role to user
        console.log("Assigning contractor role to user...");
        await accessControl.assignRoleToUser(contractorUser.id, contractorRoleId);

        // Get current date for demonstration
        const now = new Date();
        console.log(`Current date: ${now.toISOString()}`);
        
        // Calculate dates for policies
        // Active policy: Started 30 days ago, ends 30 days from now
        const activeStart = new Date(now);
        activeStart.setDate(activeStart.getDate() - 30);
        
        const activeEnd = new Date(now);
        activeEnd.setDate(activeEnd.getDate() + 30);

        // Future policy: Starts 30 days from now, ends 60 days from now
        const futureStart = new Date(now);
        futureStart.setDate(futureStart.getDate() + 30);
        
        const futureEnd = new Date(now);
        futureEnd.setDate(futureEnd.getDate() + 60);

        // Expired policy: Started 60 days ago, ended 30 days ago
        const expiredStart = new Date(now);
        expiredStart.setDate(expiredStart.getDate() - 60);
        
        const expiredEnd = new Date(now);
        expiredEnd.setDate(expiredEnd.getDate() - 30);

        // Create policies with time constraints
        console.log("Creating time-based policies...");

        // 1. Active policy - accessible now
        const activePolicy: PolicyDocument = {
            Version: "2023-11-15",
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["read", "update"],
                    Resource: ["project/current"],
                    StartDate: activeStart.toISOString(), // 30 days ago
                    EndDate: activeEnd.toISOString()      // 30 days from now
                }
            ]
        };

        const activePolicyId = uuidv4();
        await accessControl.createPolicy({
            id: activePolicyId,
            document: activePolicy
        });

        // 2. Future policy - not yet active
        const futurePolicy: PolicyDocument = {
            Version: "2023-11-15",
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["read", "update"],
                    Resource: ["project/future"],
                    StartDate: futureStart.toISOString(), // 30 days from now
                    EndDate: futureEnd.toISOString()      // 60 days from now
                }
            ]
        };

        const futurePolicyId = uuidv4();
        await accessControl.createPolicy({
            id: futurePolicyId,
            document: futurePolicy
        });

        // 3. Expired policy - no longer active
        const expiredPolicy: PolicyDocument = {
            Version: "2023-11-15",
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["read", "update"],
                    Resource: ["project/past"],
                    StartDate: expiredStart.toISOString(), // 60 days ago
                    EndDate: expiredEnd.toISOString()      // 30 days ago
                }
            ]
        };

        const expiredPolicyId = uuidv4();
        await accessControl.createPolicy({
            id: expiredPolicyId,
            document: expiredPolicy
        });

        // 4. Mixed policy with multiple statements with different time constraints
        const mixedPolicy: PolicyDocument = {
            Version: "2023-11-15",
            Statement: [
                {
                    Effect: Effect.Allow,
                    Action: ["read"],
                    Resource: ["project/always-readable"],
                    // No date constraints - always active
                },
                {
                    Effect: Effect.Allow,
                    Action: ["update"],
                    Resource: ["project/always-readable"],
                    StartDate: activeStart.toISOString(), // 30 days ago
                    EndDate: activeEnd.toISOString()      // 30 days from now
                },
                {
                    Effect: Effect.Allow,
                    Action: ["delete"],
                    Resource: ["project/always-readable"],
                    StartDate: futureStart.toISOString(), // 30 days from now
                    EndDate: futureEnd.toISOString()      // 60 days from now
                }
            ]
        };

        const mixedPolicyId = uuidv4();
        await accessControl.createPolicy({
            id: mixedPolicyId,
            document: mixedPolicy
        });

        // Attach all policies to contractor role
        console.log("Attaching policies to contractor role...");
        await accessControl.attachPolicyToRole(activePolicyId, contractorRoleId);
        await accessControl.attachPolicyToRole(futurePolicyId, contractorRoleId);
        await accessControl.attachPolicyToRole(expiredPolicyId, contractorRoleId);
        await accessControl.attachPolicyToRole(mixedPolicyId, contractorRoleId);

        // Test access control with time-based policies
        console.log("\nTesting access control with time-based policies...");
        console.log("-------------------------------------------------");

        // Active policy tests
        const canReadCurrent = await accessControl.hasAccess(
            contractorUser.id,
            "read",
            "project/current"
        );
        console.log(`Contractor can read current project: ${canReadCurrent}`); // Should be true

        const canUpdateCurrent = await accessControl.hasAccess(
            contractorUser.id,
            "update",
            "project/current"
        );
        console.log(`Contractor can update current project: ${canUpdateCurrent}`); // Should be true

        // Future policy tests
        const canReadFuture = await accessControl.hasAccess(
            contractorUser.id,
            "read",
            "project/future"
        );
        console.log(`Contractor can read future project: ${canReadFuture}`); // Should be false

        const canUpdateFuture = await accessControl.hasAccess(
            contractorUser.id,
            "update",
            "project/future"
        );
        console.log(`Contractor can update future project: ${canUpdateFuture}`); // Should be false

        // Expired policy tests
        const canReadPast = await accessControl.hasAccess(
            contractorUser.id,
            "read",
            "project/past"
        );
        console.log(`Contractor can read past project: ${canReadPast}`); // Should be false

        const canUpdatePast = await accessControl.hasAccess(
            contractorUser.id,
            "update",
            "project/past"
        );
        console.log(`Contractor can update past project: ${canUpdatePast}`); // Should be false

        // Mixed policy tests
        console.log("\nMixed policy tests - different statements with different time constraints:");
        const canReadAlways = await accessControl.hasAccess(
            contractorUser.id,
            "read",
            "project/always-readable"
        );
        console.log(`Contractor can read always-readable project: ${canReadAlways}`); // Should be true (no time constraint)

        const canUpdateAlways = await accessControl.hasAccess(
            contractorUser.id,
            "update",
            "project/always-readable"
        );
        console.log(`Contractor can update always-readable project: ${canUpdateAlways}`); // Should be true (current time is within active range)

        const canDeleteAlways = await accessControl.hasAccess(
            contractorUser.id,
            "delete",
            "project/always-readable"
        );
        console.log(`Contractor can delete always-readable project: ${canDeleteAlways}`); // Should be false (future time constraint)

        console.log("\nExample completed successfully!");

    } catch (error) {
        console.error("Error in example:", error);
    }
}

// Run the example
run();