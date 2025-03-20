export interface User {
    id: string;
    name: string;
    roles?: string[];
    policies?: string[];
}

export interface Role {
    id: string;
    name: string;
    policies?: string[];
}

export enum Effect {
    Allow = 'Allow',
    Deny = 'Deny'
}

export interface PolicyStatement {
    Effect: Effect;
    Action: string[];
    Resource: string[];
    Condition?: Record<string, any>;
}

export interface PolicyDocument {
    Version: string;
    Statement: PolicyStatement[];
}

export interface Policy {
    id: string;
    document: PolicyDocument;
}