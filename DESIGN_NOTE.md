# Audit Logging System - Design Document

## Executive Summary

This document outlines the design and implementation of an automated audit logging system for Strapi CMS. The system captures all content changes (create, update, delete) performed through Strapi's Content API, storing comprehensive metadata for compliance, debugging, and analytics purposes.

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Strapi Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────────┐             │
│  │  Content API │────────▶│  Audit Service   │             │
│  │  (Create/    │         │  (Middleware)    │             │
│  │  Update/     │         └────────┬─────────┘             │
│  │  Delete)     │                  │                        │
│  └──────────────┘                  │                        │
│                                    ▼                        │
│                          ┌──────────────────┐              │
│                          │  Audit Log DB    │              │
│                          │  (audit_logs)    │              │
│                          └──────────────────┘              │
│                                    │                        │
│                                    ▼                        │
│  ┌──────────────────────────────────────────┐              │
│  │  Audit Logs API (/api/audit-logs)       │              │
│  │  - Filter by content type, user, action │              │
│  │  - Date range filtering                  │              │
│  │  - Pagination & Sorting                  │              │
│  └──────────────────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Audit Service (Core Plugin)**
- Location: `packages/plugins/audit-log/`
- Responsibility: Intercept lifecycle events and create audit entries
- Integration: Hooks into Strapi's lifecycle middleware system

#### 2. **Database Schema**
```typescript
interface AuditLog {
  id: number;
  contentType: string;      // e.g., "api::article.article"
  recordId: string;          // ID of the modified record
  action: 'create' | 'update' | 'delete';
  timestamp: Date;
  userId?: number;           // Authenticated user ID (if available)
  username?: string;         // User display name
  changedFields?: object;    // For updates: {field: {old, new}}
  payload?: object;          // For creates: full record data
  ipAddress?: string;        // Request IP
  userAgent?: string;        // Request user agent
  metadata?: object;         // Additional context
}
```

#### 3. **REST API Endpoints**
- `GET /api/audit-logs` - List audit logs with filtering
- `GET /api/audit-logs/:id` - Get specific audit log entry
- Query parameters: contentType, userId, action, startDate, endDate, page, pageSize, sort

#### 4. **Permission System**
- New permission: `plugin::audit-log.read`
- Integration with Strapi's RBAC
- Only users with this permission can access audit logs

## Implementation Details

### 1. Plugin Structure

```
packages/plugins/audit-log/
├── admin/                     # Admin UI components (optional)
│   └── src/
│       ├── components/
│       │   └── AuditLogTable.tsx
│       └── pages/
│           └── AuditLogsPage.tsx
├── server/
│   ├── config/
│   │   └── index.ts          # Plugin configuration
│   ├── content-types/
│   │   └── audit-log.ts      # Audit log content type definition
│   ├── controllers/
│   │   └── audit-log.ts      # API controllers
│   ├── routes/
│   │   └── index.ts          # API routes
│   ├── services/
│   │   ├── audit-log.ts      # Core audit service
│   │   └── index.ts
│   ├── middlewares/
│   │   └── audit.ts          # Lifecycle middleware
│   ├── policies/
│   │   └── has-audit-permission.ts
│   └── register.ts           # Plugin registration
├── package.json
└── README.md
```

### 2. Lifecycle Hooks Integration

The audit system hooks into Strapi's lifecycle events:

```typescript
// Middleware registration
strapi.db.lifecycles.subscribe({
  models: ['*'], // Subscribe to all models
  
  async afterCreate(event) {
    await auditService.logCreate(event);
  },
  
  async afterUpdate(event) {
    await auditService.logUpdate(event);
  },
  
  async afterDelete(event) {
    await auditService.logDelete(event);
  }
});
```

### 3. Change Detection (Diff Calculation)

For UPDATE operations, we calculate field-level diffs:

```typescript
function calculateDiff(oldData, newData) {
  const changes = {};
  
  for (const key in newData) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  }
  
  return changes;
}
```

### 4. Configuration System

```typescript
// config/plugins.ts
export default {
  'audit-log': {
    enabled: true,
    config: {
      // Global enable/disable
      enabled: true,
      
      // Content types to exclude from logging
      excludeContentTypes: [
        'admin::user',           // Sensitive data
        'plugin::upload.file'    // Large volumes
      ],
      
      // Store full payload for creates (vs just IDs)
      storeFullPayload: true,
      
      // Retention policy (days)
      retentionDays: 90,
      
      // Performance: async logging
      asyncLogging: true,
      
      // Capture IP and User Agent
      captureRequestMetadata: true
    }
  }
};
```

### 5. Database Indexing Strategy

For efficient querying, we create indexes on:
- `contentType` - Filter by content type
- `action` - Filter by operation type
- `timestamp` - Date range queries and sorting
- `userId` - Filter by user
- Composite index: `(contentType, timestamp)` - Common query pattern

```typescript
indexes: [
  { fields: ['contentType'] },
  { fields: ['action'] },
  { fields: ['timestamp'] },
  { fields: ['userId'] },
  { fields: ['contentType', 'timestamp'] }
]
```

## API Specification

### GET /api/audit-logs

**Query Parameters:**
- `contentType` (string): Filter by content type
- `userId` (number): Filter by user ID
- `action` (enum): Filter by action (create, update, delete)
- `startDate` (ISO date): Start of date range
- `endDate` (ISO date): End of date range
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 25, max: 100)
- `sort` (string): Sort field (default: timestamp:desc)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "contentType": "api::article.article",
      "recordId": "123",
      "action": "update",
      "timestamp": "2025-10-26T10:30:00Z",
      "userId": 5,
      "username": "john.doe@example.com",
      "changedFields": {
        "title": {
          "old": "Old Title",
          "new": "New Title"
        }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 10,
      "total": 250
    }
  }
}
```

## Security Considerations

### 1. **Permission-Based Access**
- Only users with `plugin::audit-log.read` permission can access logs
- Admin UI integration with Strapi's permission system
- API protected by authentication middleware

### 2. **Sensitive Data Handling**
- Option to exclude sensitive content types (e.g., user passwords)
- Configurable field masking for sensitive data
- Audit logs themselves are not audited (prevent recursion)

### 3. **Data Retention**
- Configurable retention policy
- Automatic cleanup of old logs
- Option for archival before deletion

### 4. **Performance Impact**
- Async logging to prevent blocking main operations
- Batch inserts for high-volume scenarios
- Database connection pooling
- Optional queueing system (Redis/Bull) for high traffic

## Performance Optimization

### 1. **Async Logging**
```typescript
// Non-blocking audit log creation
async logCreate(event) {
  // Don't await - fire and forget
  this.createAuditLog(event).catch(err => {
    strapi.log.error('Audit log failed:', err);
  });
}
```

### 2. **Batch Processing**
```typescript
// Buffer logs and insert in batches
const logBuffer = [];
const BATCH_SIZE = 100;

if (logBuffer.length >= BATCH_SIZE) {
  await strapi.db.query('plugin::audit-log.audit-log')
    .createMany(logBuffer);
  logBuffer.length = 0;
}
```

### 3. **Selective Logging**
- Exclude high-volume, low-value content types
- Configurable per-content-type logging levels
- Skip logging for system-generated changes

## Testing Strategy

### Unit Tests
- Audit service logic
- Diff calculation
- Permission checks
- Configuration parsing

### Integration Tests
- Lifecycle hook integration
- API endpoint responses
- Filtering and pagination
- Database queries

### Performance Tests
- High-volume logging (1000+ logs/second)
- Query performance with large datasets
- Memory usage monitoring

## Migration Strategy

### For Existing Strapi Installations

1. **Install Plugin**
```bash
npm install @strapi/plugin-audit-log
```

2. **Run Migrations**
```bash
npm run strapi migration:run
```

3. **Configure**
Update `config/plugins.ts` with desired settings

4. **Update Permissions**
Assign `plugin::audit-log.read` permission to appropriate roles

## Monitoring & Maintenance

### Health Checks
- Monitor audit log creation success rate
- Alert on high failure rates
- Track database size growth

### Metrics to Track
- Logs created per minute
- Average log creation time
- Storage utilization
- Query performance

### Maintenance Tasks
- Periodic archival of old logs
- Database optimization (VACUUM/ANALYZE)
- Index maintenance

## Future Enhancements

### Phase 2 Features
1. **Export Functionality** - CSV/JSON export of audit logs
2. **Advanced Search** - Full-text search in changed fields
3. **Audit Log Visualization** - Timeline view, activity charts
4. **Webhooks** - Real-time notifications for critical changes
5. **Compliance Reports** - Pre-built reports for SOC2, GDPR
6. **Restoration** - Rollback changes from audit logs

### Phase 3 Features
1. **ML-based Anomaly Detection** - Flag suspicious patterns
2. **Blockchain Integration** - Immutable audit trail
3. **Multi-tenancy Support** - Per-tenant audit logs
4. **Advanced Diff Visualization** - Visual diff viewer

## Conclusion

This audit logging system provides comprehensive tracking of all content changes in Strapi while maintaining performance and security. The modular design allows for easy extension and customization based on specific compliance or operational requirements.

The implementation follows Strapi's plugin architecture best practices and integrates seamlessly with existing authentication, permission, and content management systems.

## References

- [Strapi Plugin Development](https://docs.strapi.io/dev-docs/plugins-development)
- [Strapi Lifecycle Hooks](https://docs.strapi.io/dev-docs/backend-customization/models#lifecycle-hooks)
- [Strapi Permission System](https://docs.strapi.io/dev-docs/plugins/users-permissions)
- [Database Best Practices](https://docs.strapi.io/dev-docs/database)

