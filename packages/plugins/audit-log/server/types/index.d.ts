import type { Core } from '@strapi/types'; // Use 'type' import

export interface AuditLogPluginConfig {
  enabled: boolean;
  excludeContentTypes: string[];
  kafka: {
    brokers: string[];
    topic: string;
  };
}

// Extend Core.Event.Base directly
export interface AuditLogEvent extends Core.Event.Base {
  // We can refine the action type if needed, but for now, let's rely on Core.Event.Base's action type
  // The 'params' and 'result' properties are already part of Core.Event.Base
  model: {
    uid: string;
    singularName: string;
  };
}
