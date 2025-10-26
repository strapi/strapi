export interface AuditLogModel {
  uid: string;
  [key: string]: any;
}

export interface AuditLogUser {
  id: number;
  [key: string]: any;
}

export interface AuditLogEvent extends Event {
  model: AuditLogModel;
  result?: Record<string, any>;
  params?: {
    user?: AuditLogUser;
    [key: string]: any;
  };
}

export interface AuditLogEntry {
  id?: number;
  contentType: string;
  recordId: string | number;
  action: 'create' | 'update' | 'delete';
  user?: number | null;
  timestamp: Date;
  payload?: string;
  diff?: Record<string, any>;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  contentType?: string;
  user?: string;
  action?: 'create' | 'update' | 'delete';
  startDate?: string;
  endDate?: string;
}

export interface AuditLogConfig {
  enabled: boolean;
  excludeContentTypes?: string[];
  maxPayloadSize?: number;
}
