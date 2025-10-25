# Audit Logs Plugin - Design & Architecture

## Overview

This document describes the architectural decisions, design patterns, and implementation approach for the Strapi Audit Logs plugin. The plugin provides comprehensive audit logging capabilities for all content changes in Strapi, capturing metadata about create, update, delete, publish, and unpublish operations.

## Table of Contents

1. [Design Goals](#design-goals)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Data Flow](#data-flow)
5. [Technical Decisions](#technical-decisions)
6. [Implementation Details](#implementation-details)
7. [Security Considerations](#security-considerations)
8. [Performance Optimizations](#performance-optimizations)
9. [Future Enhancements](#future-enhancements)

## Design Goals

### Primary Objectives

1. **Transparency**: Capture all content changes automatically without requiring manual instrumentation
2. **Comprehensiveness**: Record sufficient metadata to answer "who, what, when, and how" for every change
3. **Non-Intrusiveness**: Ensure audit logging doesn't negatively impact application performance
4. **Security**: Implement proper access controls and data sanitization
5. **Flexibility**: Allow configuration to exclude content types and set retention policies
6. **Maintainability**: Follow Strapi's plugin architecture and best practices

### Non-Goals

- Real-time streaming of audit events
- Built-in analytics dashboard (future enhancement)
- Cross-instance audit aggregation
- Change rollback functionality

## Architecture Overview

### High-Level Design

The plugin follows Strapi's standard plugin architecture with server and admin components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Strapi Application                        │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Content API   │────────▶│  Document Service │           │
│  └────────────────┘         └──────────────────┘           │
│                                      │                       │
│                                      ▼                       │
│                          ┌───────────────────────┐          │
│                          │  Lifecycle Hooks      │          │
│                          │  - DB Lifecycles      │          │
│                          │  - Document Middleware│          │
│                          └───────────────────────┘          │
│                                      │                       │
│                                      ▼                       │
│                          ┌───────────────────────┐          │
│                          │  Audit Logs Service   │          │
│                          │  - logCreate()        │          │
│                          │  - logUpdate()        │          │
│                          │  - logDelete()        │          │
│                          └───────────────────────┘          │
│                                      │                       │
│                                      ▼                       │
│                          ┌───────────────────────┐          │
│                          │  audit_logs Table     │          │
│                          │  (Database)           │          │
│                          └───────────────────────┘          │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │  Admin API     │────────▶│  Audit Controller │           │
│  │  /audit-logs   │         │  - find()         │           │
│  └────────────────┘         │  - findOne()      │           │
│                             │  - stats()        │           │
│                             └──────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Structure

```
packages/plugins/audit-logs/
├── server/
│   └── src/
│       ├── content-types/
│       │   └── audit-log/
│       │       ├── schema.json          # Content type definition
│       │       └── index.ts
│       ├── controllers/
│       │   └── audit-logs.ts            # REST API handlers
│       ├── routes/
│       │   └── index.ts                 # API route definitions
│       ├── services/
│       │   └── audit-logs.ts            # Business logic
│       ├── config/
│       │   └── index.ts                 # Plugin configuration
│       ├── bootstrap.ts                 # Lifecycle hooks setup
│       ├── register.ts                  # Permission registration
│       ├── utils.ts                     # Helper functions
│       └── index.ts                     # Plugin entry point
├── admin/
│   └── src/
│       ├── index.ts                     # Admin panel integration
│       ├── pluginId.ts
│       └── translations/
│           └── en.json
└── package.json
```

## Core Components

### 1. Content Type Definition

**Location**: `server/src/content-types/audit-log/schema.json`

The audit log content type stores all audit trail information:

```json
{
  "collectionName": "audit_logs",
  "attributes": {
    "contentType": "string",      // UID of the content type
    "recordId": "string",          // ID of the modified record
    "action": "enumeration",       // create|update|delete|publish|unpublish
    "userId": "integer",           // User who performed the action
    "userName": "string",          // Username for quick reference
    "userEmail": "string",         // Email for quick reference
    "changedFields": "json",       // Array of changed field names
    "previousData": "json",        // State before change
    "newData": "json",             // State after change
    "payload": "json",             // Original request payload
    "timestamp": "datetime"        // When the action occurred
  }
}
```

**Design Rationale**:
- Denormalized user information (name, email) for performance and data retention
- Separate fields for previous/new data to enable diffing
- JSON fields for flexibility in storing varying data structures
- Timestamp field for efficient querying and retention policies

### 2. Lifecycle Hooks

**Location**: `server/src/bootstrap.ts`

The plugin uses two complementary hooking mechanisms:

#### A. Database Lifecycle Hooks

Subscribes to low-level database operations:

```typescript
strapi.db.lifecycles.subscribe(async (event) => {
  const { action, model, result, params } = event;
  // Handle afterCreate, afterUpdate, afterDelete
});
```

**Advantages**:
- Captures all database changes
- Works at the ORM level

**Limitations**:
- Limited context about the request
- May not have user information

#### B. Document Service Middleware

Intercepts document service operations:

```typescript
strapi.documents.use(async (context, next) => {
  // Capture context (user, content type, action)
  const result = await next();
  // Log the operation with full context
});
```

**Advantages**:
- Rich context including user information
- Operates at the service layer
- Better for tracking publish/unpublish actions

**Strategy**: Use both for comprehensive coverage. Document middleware provides better context, while database hooks ensure nothing is missed.

### 3. Services Layer

**Location**: `server/src/services/audit-logs.ts`

Encapsulates all business logic:

- `create()`: Creates a new audit log entry
- `find()`: Queries logs with filtering and pagination
- `findOne()`: Retrieves a single log entry
- `logCreate()`: Specialized method for create actions
- `logUpdate()`: Specialized method for updates with diffing
- `logDelete()`: Specialized method for deletions
- `logPublish()`/`logUnpublish()`: For draft/publish workflows
- `cleanup()`: Removes logs older than retention period

**Design Pattern**: Service layer provides abstraction over database operations and implements domain logic like diffing and sanitization.

### 4. Controllers

**Location**: `server/src/controllers/audit-logs.ts`

Handles HTTP requests and responses:

- `find()`: GET /audit-logs with query parameters
- `findOne()`: GET /audit-logs/:id
- `stats()`: GET /audit-logs/stats for analytics

**Error Handling**: Controllers catch service-layer exceptions and return appropriate HTTP status codes.

### 5. Configuration System

**Location**: `server/src/config/index.ts`

Provides runtime configuration with validation:

```typescript
{
  enabled: true,                    // Global enable/disable
  excludeContentTypes: [],          // Content types to skip
  capturePayload: true,             // Store full request payload
  retentionDays: null,             // Auto-cleanup period
}
```

**Validation**: Configuration is validated on plugin load to catch misconfigurations early.

## Data Flow

### Create Operation

```
1. User creates content via Content API
   ↓
2. Strapi Document Service processes request
   ↓
3. Document Middleware intercepts
   - Captures user context
   - Stores content type info
   ↓
4. Database operation executes
   ↓
5. Document Middleware continues
   - Calls auditLogsService.logCreate()
   - Passes result data and user info
   ↓
6. Audit log entry created
   - Sanitizes sensitive data
   - Stores in audit_logs table
   ↓
7. Original response returned to user
```

### Update Operation

```
1. User updates content via Content API
   ↓
2. Document Middleware intercepts
   - Fetches current data (before update)
   ↓
3. Database operation executes
   ↓
4. Document Middleware continues
   - Calls auditLogsService.logUpdate()
   - Passes previousData and newData
   ↓
5. Service calculates diff
   - Compares field-by-field
   - Identifies changed fields
   ↓
6. Audit log entry created
   - Records changed fields
   - Stores before/after snapshots
   ↓
7. Original response returned to user
```

### Query Operation

```
1. Admin user requests audit logs
   ↓
2. Controller receives request
   - Extracts query parameters
   - Validates permissions
   ↓
3. Service layer queries database
   - Applies filters
   - Implements pagination
   - Sorts results
   ↓
4. Results formatted and returned
   - Includes pagination metadata
   - Sanitized output
```

## Technical Decisions

### 1. Plugin vs Core Feature

**Decision**: Implement as a plugin rather than core feature

**Rationale**:
- Modularity: Can be enabled/disabled per project
- Maintainability: Isolated codebase
- Flexibility: Users can customize or replace
- Strapi Best Practice: Extensions should be plugins

### 2. Dual Hook Strategy

**Decision**: Use both database lifecycles and document middleware

**Rationale**:
- Database hooks ensure complete coverage
- Document middleware provides better context
- Redundancy ensures critical operations aren't missed
- Deduplication handled by service layer

### 3. Denormalized User Data

**Decision**: Store user name and email directly in audit logs

**Rationale**:
- Performance: Avoid joins on every query
- Data Integrity: Preserve audit trail even if user is deleted
- Compliance: GDPR requires ability to delete user data but keep audit trails
- Trade-off: Slight data redundancy for significant query performance

### 4. JSON Fields for Data Storage

**Decision**: Use JSON fields for previousData, newData, and payload

**Rationale**:
- Flexibility: Different content types have different schemas
- Storage Efficiency: Only store what changed
- Query Capability: Modern databases (PostgreSQL) support JSON queries
- Simplicity: No need for complex EAV or schema-per-content-type

### 5. Synchronous Logging

**Decision**: Log audit entries synchronously (not queued)

**Rationale**:
- Reliability: Guaranteed logging before response
- Simplicity: No queue infrastructure needed
- Acceptable Performance: Database writes are fast
- Trade-off: Slight latency increase for comprehensive audit trail

**Future Consideration**: For high-throughput scenarios, could add optional async queue.

### 6. No Rollback Functionality

**Decision**: Audit logs are read-only; no built-in rollback

**Rationale**:
- Complexity: Rollback is complex with relations
- Safety: Prevents accidental data restoration
- Scope: Focus on auditing, not versioning
- Alternative: Users can build rollback using audit data

## Implementation Details

### Data Sanitization

Sensitive fields are automatically redacted:

```typescript
const sensitiveFields = ['password', 'resetPasswordToken', 'registrationToken'];

sensitiveFields.forEach(field => {
  if (data[field]) {
    data[field] = '[REDACTED]';
  }
});
```

**Extensibility**: Users can add custom sensitive fields by modifying the `sanitizeData()` utility.

### Field Diffing Algorithm

```typescript
export const calculateDiff = (oldData, newData) => {
  const changedFields = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  allKeys.forEach(key => {
    // Skip internal fields
    if (['id', 'createdAt', 'updatedAt'].includes(key)) return;
    
    // Deep comparison using JSON stringification
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
};
```

**Trade-offs**:
- Simple and reliable for most cases
- JSON stringification handles nested objects
- May produce false positives for equivalent but differently ordered objects
- Performance acceptable for typical content sizes

### Content Type Exclusion

Certain content types are always excluded:

```typescript
// Always exclude
- plugin::audit-logs.audit-log  // Prevent infinite loops
- admin::*                       // Internal admin data
- strapi::*                      // Core system data

// Optional exclusion via config
- User-specified content types
```

### Permission System Integration

```typescript
// Register custom permission action
await strapi.admin.services.permission.actionProvider.registerMany([
  {
    section: 'plugins',
    displayName: 'Read Audit Logs',
    uid: 'read',
    pluginName: 'audit-logs',
  },
]);

// Protect routes with permission
config: {
  policies: [
    'admin::isAuthenticatedAdmin',
    {
      name: 'admin::hasPermissions',
      config: { actions: ['plugin::audit-logs.read'] },
    },
  ],
}
```

### Cleanup Cron Job

```typescript
strapi.cron.add({
  'audit-logs-cleanup': {
    task: async () => {
      const auditLogsService = getService('audit-logs');
      await auditLogsService.cleanup(config.retentionDays);
    },
    options: {
      rule: '0 2 * * *',  // 2 AM daily
    },
  },
});
```

**Scheduling**: Runs at low-traffic hours to minimize performance impact.

## Security Considerations

### 1. Access Control

- All endpoints require authentication
- Role-based permissions via `plugin::audit-logs.read`
- No public access to audit logs
- No delete/update endpoints (logs are immutable)

### 2. Data Sanitization

- Passwords and tokens automatically redacted
- User-provided data sanitized before storage
- Output sanitization via Strapi's built-in sanitizers

### 3. Injection Prevention

- All queries use Strapi's ORM (parameterized)
- No raw SQL with user input
- Query parameters validated and typed

### 4. Information Disclosure

- Audit logs may contain sensitive business logic
- Access strictly controlled via permissions
- Consider encrypting JSON fields for PII

### 5. Audit Log Integrity

- Logs are immutable (no update/delete endpoints)
- Database-level constraints prevent tampering
- Consider write-once storage for compliance scenarios

## Performance Optimizations

### 1. Database Indexing

Indexes created automatically:
- `contentType` - for filtering by content type
- `recordId` - for record-specific audit trails
- `action` - for action-type filtering
- `userId` - for user activity tracking
- `timestamp` - for date range queries and sorting

### 2. Pagination

Default page size: 25 records
Maximum page size: 100 records
Prevents large result sets from overwhelming the API

### 3. Selective Data Capture

```typescript
config: {
  capturePayload: false,  // Disable full payload storage
}
```

Reduces storage for high-volume scenarios.

### 4. Non-Blocking Operations

```typescript
try {
  await auditLogsService.create(...);
} catch (error) {
  strapi.log.error('Audit log failed:', error);
  // Don't throw - continue with main operation
}
```

Failed audit logging never breaks the main operation.

### 5. Efficient Queries

- Use compound indexes for common query patterns
- Leverage database JSON query capabilities
- Consider partitioning for very large datasets

### 6. Retention Policy

Automatic cleanup prevents unbounded growth:

```typescript
config: {
  retentionDays: 90,  // Keep 90 days
}
```

## Testing Strategy

### Unit Tests

- Service layer methods (create, find, diff calculation)
- Utility functions (sanitization, user extraction)
- Configuration validation

### Integration Tests

- Lifecycle hook triggers
- End-to-end logging workflows
- Permission enforcement
- API endpoint responses

### Test Fixtures

```typescript
const mockAuditLog = {
  contentType: 'api::article.article',
  recordId: '123',
  action: 'update',
  userId: 1,
  // ...
};
```

## Future Enhancements

### 1. Admin Dashboard

Visual interface for browsing audit logs:
- Timeline view
- Filtering UI
- User activity charts
- Content type breakdown

### 2. Webhooks

Trigger external systems on audit events:
```typescript
config: {
  webhooks: [
    { url: 'https://example.com/audit', events: ['delete'] }
  ]
}
```

### 3. Export Functionality

Download audit logs in various formats:
- CSV for spreadsheets
- JSON for processing
- PDF for reports

### 4. Advanced Analytics

- Most active users
- Peak activity times
- Change patterns
- Anomaly detection

### 5. Change Rollback

Implement content restoration from audit log data:
```typescript
await auditLogsService.rollback(logId);
```

### 6. Multi-Tenancy Support

Separate audit logs per tenant in multi-tenant deployments.

### 7. Async Queue Option

For ultra-high-throughput scenarios:
```typescript
config: {
  asyncLogging: true,
  queue: 'redis',
}
```

### 8. Encryption at Rest

Encrypt sensitive audit log data:
```typescript
config: {
  encryption: {
    enabled: true,
    fields: ['previousData', 'newData'],
  }
}
```

### 9. Compliance Presets

Pre-configured settings for compliance frameworks:
```typescript
config: {
  preset: 'GDPR',  // or 'HIPAA', 'SOC2'
}
```

### 10. Real-Time Streaming

WebSocket or SSE for live audit log streaming to monitoring dashboards.

## Conclusion

The Audit Logs plugin provides comprehensive, performant, and secure audit logging for Strapi applications. Its design balances completeness with performance, leveraging Strapi's architecture while remaining flexible and maintainable. The plugin is production-ready with clear paths for future enhancements based on user needs.

## References

- [Strapi Plugin Documentation](https://docs.strapi.io/developer-docs/latest/development/plugins-development.html)
- [Strapi Lifecycle Hooks](https://docs.strapi.io/developer-docs/latest/development/backend-customization/models.html#lifecycle-hooks)
- [Strapi Permissions](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/rbac.html)

