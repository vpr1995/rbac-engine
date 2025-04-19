/**
 * Repository factory module for creating database repository instances
 * based on client types and repository constructors.
 * @module factory
 */
import { IBaseRepository } from "./base-repo";

/**
 * Type definition for repository constructors with generic client type T
 * @typedef {new (client: T) => IBaseRepository} RepositoryConstructor<T>
 */
type RepositoryConstructor<T> = new (client: T) => IBaseRepository;

/**
 * Creates an appropriate repository instance based on the provided client and repository constructor
 * @template T - The type of the client that the repository constructor expects
 * @param {T} client - Database client instance
 * @param {RepositoryConstructor<T>} repositoryConstructor - Constructor function for the repository implementation
 * @returns {IBaseRepository} Repository implementation instance
 * @throws {Error} When client or repository constructor is not provided
 * @example
 * // Using with DynamoDB
 * import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
 * import { createRepository, DynamoDBRepository } from "rbac-engine";
 * 
 * const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
 * const repo = createRepository(dynamoClient, DynamoDBRepository);
 */
export function createRepository<T>(client: T, repositoryConstructor: RepositoryConstructor<T>): IBaseRepository {
    if (!client) {
        throw new Error("Client is required to create a repository");
    }
    if (!repositoryConstructor) {
        throw new Error("Repository constructor is required to create a repository");
    }
    return new repositoryConstructor(client);
}