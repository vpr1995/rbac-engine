import { StatementBuilder } from '../../builders/statement-builder';
import { PolicyBuilder } from '../../builders/policy-builder';
import { BuilderValidationError } from '../../builders/types';
import { Effect, PolicyStatement } from '../../models';

describe('StatementBuilder', () => {
  describe('Basic statement building', () => {
    it('should build a simple allow statement', () => {
      const statement = new StatementBuilder()
        .allow(['read', 'write'])
        .on(['document/*'])
        .build();

      expect(statement.Effect).toBe(Effect.Allow);
      expect(statement.Action).toEqual(['read', 'write']);
      expect(statement.Resource).toEqual(['document/*']);
      expect(statement.Condition).toBeUndefined();
      expect(statement.StartDate).toBeUndefined();
      expect(statement.EndDate).toBeUndefined();
    });

    it('should build a simple deny statement', () => {
      const statement = new StatementBuilder()
        .deny(['delete'])
        .on(['document/confidential/*'])
        .build();

      expect(statement.Effect).toBe(Effect.Deny);
      expect(statement.Action).toEqual(['delete']);
      expect(statement.Resource).toEqual(['document/confidential/*']);
    });

    it('should build a statement with conditions', () => {
      const statement = new StatementBuilder()
        .allow(['read'])
        .on(['document/*'])
        .when({ department: 'engineering', role: 'developer' })
        .build();

      expect(statement.Condition).toEqual({
        department: 'engineering',
        role: 'developer'
      });
    });

    it('should build a statement with time constraints', () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-12-31T23:59:59Z';

      const statement = new StatementBuilder()
        .allow(['read', 'write'])
        .on(['project/*'])
        .activeFrom(startDate)
        .activeUntil(endDate)
        .build();

      expect(statement.StartDate).toBe(startDate);
      expect(statement.EndDate).toBe(endDate);
    });
  });

  describe('Validation', () => {
    it('should throw error when no effect is set', () => {
      expect(() => {
        new StatementBuilder()
          .on(['document/*'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when no actions are specified', () => {
      expect(() => {
        new StatementBuilder()
          .allow([])
          .on(['document/*'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when no resources are specified', () => {
      expect(() => {
        new StatementBuilder()
          .allow(['read'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error for invalid date formats', () => {
      expect(() => {
        new StatementBuilder()
          .allow(['read'])
          .on(['document/*'])
          .activeFrom('invalid-date')
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when start date is after end date', () => {
      expect(() => {
        new StatementBuilder()
          .allow(['read'])
          .on(['document/*'])
          .activeFrom('2025-12-31T23:59:59Z')
          .activeUntil('2025-01-01T00:00:00Z')
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error for empty actions', () => {
      expect(() => {
        new StatementBuilder()
          .allow(['read', '', 'write'])
          .on(['document/*'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error for empty resources', () => {
      expect(() => {
        new StatementBuilder()
          .allow(['read'])
          .on(['document/*', '', 'other/*'])
          .build();
      }).toThrow(BuilderValidationError);
    });
  });

  describe('Method chaining', () => {
    it('should allow fluent method chaining', () => {
      const builder = new StatementBuilder();
      
      expect(builder.allow(['read'])).toBe(builder);
      expect(builder.on(['document/*'])).toBe(builder);
      expect(builder.when({ dept: 'eng' })).toBe(builder);
      expect(builder.activeFrom('2025-01-01T00:00:00Z')).toBe(builder);
      expect(builder.activeUntil('2025-12-31T23:59:59Z')).toBe(builder);
    });

    it('should override effect when called multiple times', () => {
      const statement = new StatementBuilder()
        .allow(['read'])
        .deny(['write']) // This should override the allow
        .on(['document/*'])
        .build();

      expect(statement.Effect).toBe(Effect.Deny);
      expect(statement.Action).toEqual(['write']);
    });
  });
});

describe('PolicyBuilder', () => {
  describe('Simple policy building', () => {
    it('should build a simple policy with single statement', () => {
      const policy = new PolicyBuilder('policy-123')
        .version('2023-11-15')
        .allow(['read', 'write'])
        .on(['document/*'])
        .build();

      expect(policy.id).toBe('policy-123');
      expect(policy.document.Version).toBe('2023-11-15');
      expect(policy.document.Statement).toHaveLength(1);
      expect(policy.document.Statement[0].Effect).toBe(Effect.Allow);
      expect(policy.document.Statement[0].Action).toEqual(['read', 'write']);
      expect(policy.document.Statement[0].Resource).toEqual(['document/*']);
    });

    it('should use default version when not specified', () => {
      const policy = new PolicyBuilder('policy-123')
        .allow(['read'])
        .on(['document/*'])
        .build();

      expect(policy.document.Version).toBe('2023-11-15');
    });

    it('should build a simple policy with conditions and time constraints', () => {
      const policy = new PolicyBuilder('policy-456')
        .deny(['delete'])
        .on(['document/confidential/*'])
        .when({ clearance: 'secret' })
        .activeFrom('2025-01-01T00:00:00Z')
        .activeUntil('2025-12-31T23:59:59Z')
        .build();

      const statement = policy.document.Statement[0];
      expect(statement.Effect).toBe(Effect.Deny);
      expect(statement.Condition).toEqual({ clearance: 'secret' });
      expect(statement.StartDate).toBe('2025-01-01T00:00:00Z');
      expect(statement.EndDate).toBe('2025-12-31T23:59:59Z');
    });
  });

  describe('Complex policy building', () => {
    it('should build a policy with multiple statements', () => {
      const policy = new PolicyBuilder('policy-789')
        .statement(
          new StatementBuilder()
            .allow(['read', 'write'])
            .on(['document/*'])
            .when({ department: 'engineering' })
        )
        .statement(
          new StatementBuilder()
            .deny(['delete'])
            .on(['document/confidential/*'])
        )
        .build();

      expect(policy.document.Statement).toHaveLength(2);
      expect(policy.document.Statement[0].Effect).toBe(Effect.Allow);
      expect(policy.document.Statement[1].Effect).toBe(Effect.Deny);
    });

    it('should accept pre-built PolicyStatement objects', () => {
      const preBuiltStatement: PolicyStatement = {
        Effect: Effect.Allow,
        Action: ['read'],
        Resource: ['document/*']
      };

      const policy = new PolicyBuilder('policy-pre')
        .statement(preBuiltStatement)
        .build();

      expect(policy.document.Statement).toHaveLength(1);
      expect(policy.document.Statement[0]).toEqual(preBuiltStatement);
    });

    it('should add multiple statements at once', () => {
      const statements = [
        new StatementBuilder().allow(['read']).on(['doc1/*']),
        new StatementBuilder().deny(['write']).on(['doc2/*'])
      ];

      const policy = new PolicyBuilder('policy-multi')
        .addStatements(statements)
        .build();

      expect(policy.document.Statement).toHaveLength(2);
    });
  });

  describe('Validation and error handling', () => {
    it('should throw error for empty policy ID', () => {
      expect(() => {
        new PolicyBuilder('')
          .allow(['read'])
          .on(['document/*'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when no statements are defined', () => {
      expect(() => {
        new PolicyBuilder('policy-empty')
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when mixing simple and complex modes', () => {
      expect(() => {
        new PolicyBuilder('policy-mixed')
          .allow(['read'])
          .statement(new StatementBuilder().deny(['write']).on(['doc/*']))
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should throw error when using simple methods after statement()', () => {
      expect(() => {
        new PolicyBuilder('policy-mixed2')
          .statement(new StatementBuilder().allow(['read']).on(['doc/*']))
          .deny(['write'])
          .build();
      }).toThrow(BuilderValidationError);
    });

    it('should propagate validation errors from simple statement', () => {
      expect(() => {
        new PolicyBuilder('policy-invalid')
          .allow(['read'])
          // Missing .on() call
          .build();
      }).toThrow(BuilderValidationError);
    });
  });

  describe('Static factory method', () => {
    it('should create instance using static create method', () => {
      const policy = PolicyBuilder.create('factory-policy')
        .allow(['read'])
        .on(['document/*'])
        .build();

      expect(policy.id).toBe('factory-policy');
    });
  });

  describe('Method chaining', () => {
    it('should allow fluent method chaining', () => {
      const builder = new PolicyBuilder('chain-test');
      
      expect(builder.version('1.0')).toBe(builder);
      expect(builder.allow(['read'])).toBe(builder);
      expect(builder.on(['doc/*'])).toBe(builder);
      expect(builder.when({ dept: 'eng' })).toBe(builder);
      expect(builder.activeFrom('2025-01-01T00:00:00Z')).toBe(builder);
      expect(builder.activeUntil('2025-12-31T23:59:59Z')).toBe(builder);
    });
  });
});

describe('Builder Integration', () => {
  it('should create equivalent policies using both simple and complex modes', () => {
    // Simple mode
    const simplePolicy = new PolicyBuilder('policy-simple')
      .allow(['read', 'write'])
      .on(['document/*'])
      .when({ department: 'engineering' })
      .build();

    // Complex mode
    const complexPolicy = new PolicyBuilder('policy-complex')
      .statement(
        new StatementBuilder()
          .allow(['read', 'write'])
          .on(['document/*'])
          .when({ department: 'engineering' })
      )
      .build();

    // They should have equivalent statements (ignoring IDs)
    expect(simplePolicy.document.Statement[0]).toEqual(complexPolicy.document.Statement[0]);
  });

  it('should handle complex real-world scenarios', () => {
    const policy = new PolicyBuilder('comprehensive-policy')
      .version('2023-11-15')
      .statement(
        new StatementBuilder()
          .allow(['read', 'list'])
          .on(['document/*', 'folder/*'])
          .when({ department: 'engineering' })
      )
      .statement(
        new StatementBuilder()
          .allow(['write', 'update'])
          .on(['document/*'])
          .when({ role: 'senior-engineer' })
          .activeFrom('2025-01-01T00:00:00Z')
          .activeUntil('2025-12-31T23:59:59Z')
      )
      .statement(
        new StatementBuilder()
          .deny(['delete'])
          .on(['document/production/*'])
      )
      .build();

    expect(policy.document.Statement).toHaveLength(3);
    expect(policy.document.Statement[0].Action).toEqual(['read', 'list']);
    expect(policy.document.Statement[1].StartDate).toBe('2025-01-01T00:00:00Z');
    expect(policy.document.Statement[2].Effect).toBe(Effect.Deny);
  });
});
