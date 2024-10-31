// Types for configuration and security
export type ContentTypeConfig = {
  enabled: boolean;
  mutations: boolean;
  queries: boolean;
  disabledActions: string[];
  fields: Map<string, FieldConfig>;
  securityRules?: SecurityRules;
};

export type FieldConfig = {
  enabled: boolean;
  input: boolean;
  output: boolean;
  filters: boolean;
  sensitive?: boolean;
};

export type SecurityRules = {
  requiredRoles?: string[];
  ipWhitelist?: string[];
  timeRestrictions?: {
    start?: Date;
    end?: Date;
  };
  maxAccessPerDay?: number;
};

export type AccessContext = {
  userRoles?: string[];
  ipAddress?: string;
  timestamp?: Date;
};

export type AccessResult = {
  allowed: boolean;
  reason?: string;
};

// Configuration utility class
export class ContentTypeConfigManager {
  private configs: Map<string, ContentTypeConfig>;
  private accessLogs: Map<string, { count: number, resetTime: Date }>;
  private static ALL_ACTIONS = '*';

  constructor() {
    this.configs = new Map<string, ContentTypeConfig>();
    this.accessLogs = new Map<string, { count: number, resetTime: Date }>();
  }

  // Create or get configuration for a specific content type
  public contentType(uid: string) {
    if (!this.configs.has(uid)) {
      this.configs.set(uid, this.getDefaultContentTypeConfig());
    }
    return this.createContentTypeProxy(uid);
  }

  // Default configuration for content type
  private getDefaultContentTypeConfig(): ContentTypeConfig {
    return {
      enabled: true,
      mutations: true,
      queries: true,
      disabledActions: [],
      fields: new Map(),
      securityRules: {},
    };
  }

  // Default configuration for fields
  private getDefaultFieldConfig(): FieldConfig {
    return {
      enabled: true,
      input: true,
      output: true,
      filters: true,
      sensitive: false,
    };
  }

  // Create a proxy object for content type configuration
  private createContentTypeProxy(uid: string) {
    const manager = this;
    return {
      // Core configuration methods
      isEnabled() {
        return manager.configs.get(uid)!.enabled;
      },
      isDisabled() {
        return !this.isEnabled();
      },
      areQueriesEnabled() {
        return manager.configs.get(uid)!.queries;
      },
      areQueriesDisabled() {
        return !this.areQueriesEnabled();
      },
      areMutationsEnabled() {
        return manager.configs.get(uid)!.mutations;
      },
      areMutationsDisabled() {
        return !this.areMutationsEnabled();
      },

      // Action management methods
      isActionEnabled(action: string) {
        const config = manager.configs.get(uid)!;
        return !config.disabledActions.includes(action) && 
               !config.disabledActions.includes(ContentTypeConfigManager.ALL_ACTIONS);
      },
      isActionDisabled(action: string) {
        return !this.isActionEnabled(action);
      },

      // Disable methods
      disable() {
        manager.configs.get(uid)!.enabled = false;
        return this;
      },
      disableQueries() {
        manager.configs.get(uid)!.queries = false;
        return this;
      },
      disableMutations() {
        manager.configs.get(uid)!.mutations = false;
        return this;
      },
      disableAction(action: string) {
        const config = manager.configs.get(uid)!;
        if (!config.disabledActions.includes(action)) {
          config.disabledActions.push(action);
        }
        return this;
      },
      disableActions(actions: string[] = []) {
        actions.forEach((action) => this.disableAction(action));
        return this;
      },

      // Security-related methods
      setSecurityRules(rules: SecurityRules) {
        const config = manager.configs.get(uid)!;
        config.securityRules = {
          ...config.securityRules,
          ...rules
        };
        return this;
      },
      checkAccess(context: AccessContext = {}): AccessResult {
        const config = manager.configs.get(uid)!;
        const { securityRules } = config;

        // Check required roles
        if (securityRules?.requiredRoles?.length) {
          if (!context.userRoles || 
              !context.userRoles.some(role => 
                securityRules.requiredRoles!.includes(role))) {
            return { allowed: false, reason: 'Insufficient permissions' };
          }
        }

        // Check IP whitelist
        if (securityRules?.ipWhitelist?.length) {
          if (!context.ipAddress || 
              !securityRules.ipWhitelist.includes(context.ipAddress)) {
            return { allowed: false, reason: 'IP not allowed' };
          }
        }

        // Check time restrictions
        const now = context.timestamp || new Date();
        if (securityRules?.timeRestrictions) {
          const { start, end } = securityRules.timeRestrictions;
          if ((start && now < start) || (end && now > end)) {
            return { allowed: false, reason: 'Outside allowed time' };
          }
        }

        // Check access count
        if (securityRules?.maxAccessPerDay) {
          const log = manager.accessLogs.get(uid) || { count: 0, resetTime: new Date() };
          
          // Reset if it's a new day
          if (log.resetTime.getDate() !== now.getDate()) {
            log.count = 0;
            log.resetTime = now;
          }

          if (log.count >= securityRules.maxAccessPerDay) {
            return { allowed: false, reason: 'Daily access limit exceeded' };
          }

          // Increment access count
          log.count++;
          manager.accessLogs.set(uid, log);
        }

        return { allowed: true };
      },

      // Field-specific methods
      field(fieldName: string) {
        const config = manager.configs.get(uid)!;
        const { fields } = config;

        if (!fields.has(fieldName)) {
          fields.set(fieldName, manager.getDefaultFieldConfig());
        }

        return {
          isEnabled() {
            return fields.get(fieldName)!.enabled;
          },
          hasInputEnabled() {
            return fields.get(fieldName)!.input;
          },
          hasOutputEnabled() {
            return fields.get(fieldName)!.output;
          },
          hasFiltersEnabled() {
            return fields.get(fieldName)!.filters;
          },
          isSensitive() {
            return fields.get(fieldName)!.sensitive || false;
          },
          disable() {
            const fieldConfig = fields.get(fieldName)!;
            fieldConfig.enabled = false;
            fieldConfig.output = false;
            fieldConfig.input = false;
            fieldConfig.filters = false;
            return this;
          },
          disableOutput() {
            fields.get(fieldName)!.output = false;
            return this;
          },
          disableInput() {
            fields.get(fieldName)!.input = false;
            return this;
          },
          disableFilters() {
            fields.get(fieldName)!.filters = false;
            return this;
          },
          markAsSensitive() {
            fields.get(fieldName)!.sensitive = true;
            return this;
          }
        };
      },

      // Get sensitive fields for the content type
      getSensitiveFields() {
        const { fields } = manager.configs.get(uid)!;
        return Array.from(fields.entries())
          .filter(([_, config]) => config.sensitive)
          .map(([fieldName, _]) => fieldName);
      }
    };
  }
}

// Factory function for creating a content type configuration manager
export default () => new ContentTypeConfigManager();
