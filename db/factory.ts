/**
 * Repository factory module for creating database repository instances
 * based on client types.
 * @module factory
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { IBaseRepository } from "./base-repo";
import { DynamoDBRepository } from "./dynamodb-repo";

/**
 * Type definition for repository constructors
 * @typedef {new (client: any) => IBaseRepository} RepositoryConstructor
 */
type RepositoryConstructor = new (client: any) => IBaseRepository;

/**
 * Maps client types to their corresponding repository implementations
 * @type {Array<[Function, RepositoryConstructor]>}
 */
const repositoryMap: [ Function, RepositoryConstructor ][] = [
    [ DynamoDBClient, DynamoDBRepository]
];

/**
 * Creates an appropriate repository instance based on the provided client type
 * @param {any} client - Database client instance
 * @returns {IBaseRepository} Repository implementation for the client
 * @throws {Error} When no repository is found for the client type
 */
export function createRepository(client: any): IBaseRepository {
    for (const [clientType, repositoryType] of repositoryMap) {
        if (client instanceof clientType) {
            return new repositoryType(client);
        }
    }
    throw new Error('No repository found for client');
}

/**
 * Extends the repository map with a new client type and repository implementation
 * @param {Function} clientType - Client constructor function
 * @param {RepositoryConstructor} repositoryType - Repository constructor
 */
export function extendRepositoryMap(clientType: Function, repositoryType: RepositoryConstructor): void {
    repositoryMap.push([clientType, repositoryType]);
}

/**
 * Empties the repository map
 * Primarily used for testing purposes
 */
export function emptyRepositoryMap(): void {
    repositoryMap.length = 0;
}