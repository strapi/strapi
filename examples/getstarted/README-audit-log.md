# Strapi Audit Logging System

## Overview

The audit logging system is a feature that tracks and records changes made to content types within Strapi. It provides a comprehensive audit trail of data modifications, helping maintain accountability and compliance requirements.

## Architecture

### Core Components

1. **Audit Log Model**
   - Located at `api::audit-log.audit-log`
   - Stores audit records with fields:
     - `action`: The type of operation performed
     - `date`: Timestamp of the action
     - `contentType`: The affected content type
     - `recordId`: ID of the modified record
     - `payload`: Detailed information about the change

2. **Configuration System**
```javascript
const auditLogConfig = {
  enabled: true,           // Global flag to enable/disable audit logging
  excludeContentTypes: [], // Content types to exclude from logging
  permissions: {
    read: 'read_audit_logs',   // Permission for viewing audit logs
    write: 'write_audit_logs'  // Permission for creating audit entries
  }
};
```

3. **RBAC Integration**
   - Utilizes Strapi's built-in permission system
   - Requires `read_audit_logs` permission to view audit logs
   - Requires `write_audit_logs` permission to create audit entries

### Integration Flow

1. **Content Operation**
   ```mermaid
   graph TD
   A[Content Operation] --> B{Audit Enabled?}
   B -->|Yes| C{Content Type Excluded?}
   B -->|No| F[Skip Logging]
   C -->|No| D[Create Audit Entry]
   C -->|Yes| F
   D --> E[Store in Database]
   ```

2. **Permission Check**
   ```mermaid
   graph TD
   A[Request Audit Logs] --> B{Has read_audit_logs?}
   B -->|Yes| C[Return Audit Data]
   B -->|No| D[Access Denied]
   ```

## Implementation Details

### 1. Audit Entry Creation

The system creates audit entries through the `createAuditEntry` function:

```javascript
const createAuditEntry = async (action, contentType, recordId, payload) => {
  // Check configuration
  if (!auditLogConfig.enabled) return null;
  if (auditLogConfig.excludeContentTypes.includes(contentType)) return null;

  // Create audit log entry
  return await strapi.db.query('api::audit-log.audit-log').create({
    data: {
      action,
      date: new Date(),
      contentType,
      recordId: String(recordId),
      payload: {
        contentType,
        action,
        data: payload
      }
    }
  });
};
```

### 2. Permission Management

Permissions are checked using Strapi's admin permission system:

```javascript
const checkPermission = async (userId, permission) => {
  const adminPermissions = await strapi.db.query('admin::permission').findMany({
    where: {
      action: permission,
      role: roleId,
    },
  });
  return adminPermissions?.length > 0;
};
```

### 3. Configuration Options

The configuration system provides several options:

- **enabled**: Global switch for audit logging
- **excludeContentTypes**: Array of content type UIDs to exclude
- **permissions**: Define required permissions for read/write access

## Usage Examples

1. **Creating an Audit Log Entry**
```javascript
await createAuditEntry(
  'entry.create',
  'api::article.article',
  articleId,
  articleData
);
```

2. **Checking Permissions**
```javascript
const hasAccess = await checkPermission(userId, auditLogConfig.permissions.read);
if (!hasAccess) {
  throw new Error('Permission denied');
}
```

3. **Configuring Excluded Content Types**
```javascript
auditLogConfig.excludeContentTypes = [
  'api::temporary.temporary',
  'api::draft.draft'
];
```

## Testing

The integration test script (`integration-test-audit.js`) verifies:

1. Configuration features:
   - Global enable/disable
   - Content type exclusion
   - Permission requirements

2. Audit log creation:
   - Entry creation
   - Permission enforcement
   - Data integrity

Run tests using:
```bash
cd examples/getstarted
node scripts/integration-test-audit.js
```

## Best Practices

1. **Performance**
   - Enable logging only for essential content types
   - Use content type exclusion for high-volume temporary data
   - Index frequently queried audit log fields

2. **Security**
   - Always check permissions before allowing access to audit logs
   - Regularly review and clean up old audit entries
   - Monitor audit log size and implement retention policies

3. **Configuration**
   - Document any content types excluded from logging
   - Regularly review permission assignments
   - Keep audit log configuration in version control

## Troubleshooting

Common issues and solutions:

1. **Missing Audit Logs**
   - Check if audit logging is enabled globally
   - Verify content type is not in excludeContentTypes
   - Ensure write permissions are correctly set

2. **Permission Denied**
   - Verify user has required role assignments
   - Check if permissions are correctly configured
   - Review role-permission mappings

3. **Performance Issues**
   - Consider implementing pagination for audit log queries
   - Review indexing on frequently queried fields
   - Implement cleanup policies for old audit entries