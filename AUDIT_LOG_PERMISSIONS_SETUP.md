# Audit Log Permissions Setup Guide

## Overview

This guide explains how to set up role-based access control for the audit log system in Strapi. The system includes three permission levels: read, write, and admin.

## Permission Structure

### Available Permissions

1. **`plugin::audit-log.read_audit_logs`** - Read audit logs
2. **`plugin::audit-log.write_audit_logs`** - Create/update audit logs
3. **`plugin::audit-log.admin_audit_logs`** - Admin operations (delete, cleanup)

### Permission Levels

| Permission | Operations | Endpoints |
|------------|------------|-----------|
| **read_audit_logs** | View audit logs | `GET /api/audit-logs`, `GET /api/audit-logs/:id`, `GET /api/audit-logs/stats` |
| **write_audit_logs** | Create/update audit logs | `POST /api/audit-logs`, `PUT /api/audit-logs/:id` |
| **admin_audit_logs** | Delete and cleanup operations | `DELETE /api/audit-logs/:id`, `POST /api/audit-logs/cleanup` |

## Setup Instructions

### 1. Database Setup

First, ensure the audit log permissions are registered in the database:

```javascript
// src/index.js
module.exports = {
  async bootstrap({ strapi }) {
    // Register audit log permissions
    await strapi.admin.services.permission.actionProvider.registerMany([
      {
        section: 'plugins',
        category: 'audit-log',
        subCategory: 'general',
        action: 'read_audit_logs',
        displayName: 'Read audit logs',
        pluginName: 'audit-log'
      },
      {
        section: 'plugins',
        category: 'audit-log',
        subCategory: 'general',
        action: 'write_audit_logs',
        displayName: 'Write audit logs',
        pluginName: 'audit-log'
      },
      {
        section: 'plugins',
        category: 'audit-log',
        subCategory: 'general',
        action: 'admin_audit_logs',
        displayName: 'Admin audit logs',
        pluginName: 'audit-log'
      }
    ]);
  }
};
```

### 2. Role Configuration

#### Super Admin Role
Super Admin should have all permissions by default:

```javascript
// In Strapi Admin Panel > Settings > Roles & Permissions > Super Admin
// Enable all audit-log permissions:
// ✅ plugin::audit-log.read_audit_logs
// ✅ plugin::audit-log.write_audit_logs
// ✅ plugin::audit-log.admin_audit_logs
```

#### Editor Role
Editors should have read and write permissions:

```javascript
// In Strapi Admin Panel > Settings > Roles & Permissions > Editor
// Enable audit-log permissions:
// ✅ plugin::audit-log.read_audit_logs
// ✅ plugin::audit-log.write_audit_logs
// ❌ plugin::audit-log.admin_audit_logs
```

#### Author Role
Authors should have read-only access:

```javascript
// In Strapi Admin Panel > Settings > Roles & Permissions > Author
// Enable audit-log permissions:
// ✅ plugin::audit-log.read_audit_logs
// ❌ plugin::audit-log.write_audit_logs
// ❌ plugin::audit-log.admin_audit_logs
```

### 3. Programmatic Permission Assignment

You can also assign permissions programmatically:

```javascript
// Assign permissions to a role
async function assignAuditLogPermissions(roleId, permissions) {
  const role = await strapi.admin.services.role.findOne(roleId);
  
  if (role) {
    // Add audit log permissions to the role
    const auditPermissions = permissions.map(permission => ({
      action: `plugin::audit-log.${permission}`,
      subject: null,
      properties: {},
      conditions: [],
      role: roleId
    }));

    await strapi.admin.services.permission.createMany(auditPermissions);
  }
}

// Usage examples
await assignAuditLogPermissions(1, ['read_audit_logs', 'write_audit_logs']); // Editor
await assignAuditLogPermissions(2, ['read_audit_logs']); // Author
await assignAuditLogPermissions(3, ['read_audit_logs', 'write_audit_logs', 'admin_audit_logs']); // Super Admin
```

## Configuration Options

### Environment Variables

```bash
# Enable/disable audit logging globally
AUDIT_LOG_ENABLED=true

# Exclude specific content types (comma-separated)
AUDIT_LOG_EXCLUDE_CONTENT_TYPES=audit-log,strapi::core-store

# Number of days to keep audit logs
AUDIT_LOG_CLEANUP_DAYS=90
```

### Configuration File

```javascript
// config/audit-log.js
module.exports = {
  // Global settings
  enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  
  // Content types to exclude
  excludeContentTypes: [
    'audit-log',
    'strapi::core-store',
    'strapi::webhook'
  ],
  
  // Role-based access control
  permissions: {
    readPermission: 'plugin::audit-log.read_audit_logs',
    writePermission: 'plugin::audit-log.write_audit_logs',
    adminPermission: 'plugin::audit-log.admin_audit_logs',
    
    // Default roles with access
    defaultRoles: ['Super Admin', 'Editor'],
    
    // Allow anonymous access (not recommended)
    allowAnonymous: false,
    
    // Require permissions for operations
    requirePermissions: {
      read: true,
      write: true,
      admin: true
    }
  },
  
  // Security settings
  security: {
    encryptSensitiveData: false,
    hashIpAddresses: false,
    maskSensitiveFields: ['password', 'token', 'secret'],
    rateLimitPerUser: 1000,
    rateLimitPerIp: 5000
  }
};
```

## Testing Permissions

### 1. Test Read Permission

```bash
# This should work for users with read_audit_logs permission
curl -X GET "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Test Write Permission

```bash
# This should work for users with write_audit_logs permission
curl -X POST "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "articles",
    "recordId": "123",
    "action": "create",
    "fullPayload": {"title": "Test Article"}
  }'
```

### 3. Test Admin Permission

```bash
# This should work for users with admin_audit_logs permission
curl -X POST "http://localhost:1337/api/audit-logs/cleanup" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

## Error Responses

### 401 Unauthorized
```json
{
  "data": null,
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "data": null,
  "error": {
    "status": 403,
    "name": "ForbiddenError",
    "message": "Insufficient permissions to read audit logs"
  }
}
```

### 503 Service Unavailable
```json
{
  "data": null,
  "error": {
    "status": 503,
    "name": "ServiceUnavailableError",
    "message": "Audit logging is currently disabled"
  }
}
```

## Custom Permission Checks

### In Controllers

```javascript
// Check if user has specific permission
async function checkAuditLogPermission(userId, permission) {
  const user = await strapi.admin.services.user.findOne(userId);
  if (!user) return false;
  
  const permissions = await strapi.admin.services.permission.findUserPermissions(user);
  return permissions.some(p => p.action === `plugin::audit-log.${permission}`);
}

// Usage in controller
async find(ctx) {
  const hasPermission = await checkAuditLogPermission(ctx.state.user.id, 'read_audit_logs');
  if (!hasPermission) {
    return ctx.forbidden('Insufficient permissions');
  }
  // ... rest of controller logic
}
```

### In Services

```javascript
// Check permissions in service methods
async logContentApiOperation(params) {
  // Check if user has write permission
  const hasWritePermission = await strapi.admin.services.permission
    .findUserPermissions(params.user)
    .then(permissions => 
      permissions.some(p => p.action === 'plugin::audit-log.write_audit_logs')
    );
  
  if (!hasWritePermission) {
    strapi.log.warn('User does not have permission to create audit logs');
    return null;
  }
  
  // ... rest of logging logic
}
```

## Troubleshooting

### Permission Not Working

1. **Check if permissions are registered:**
   ```javascript
   const permissions = await strapi.admin.services.permission.findMany({
     action: { $contains: 'audit-log' }
   });
   console.log('Audit log permissions:', permissions);
   ```

2. **Check user permissions:**
   ```javascript
   const userPermissions = await strapi.admin.services.permission.findUserPermissions(userId);
   console.log('User permissions:', userPermissions);
   ```

3. **Verify role assignments:**
   ```javascript
   const role = await strapi.admin.services.role.findOne(roleId, ['permissions']);
   console.log('Role permissions:', role.permissions);
   ```

### Common Issues

1. **"Permission not found"** - Run the bootstrap script to register permissions
2. **"Insufficient permissions"** - Check if user's role has the required permission
3. **"Authentication required"** - Ensure user is logged in and has valid JWT token

## Security Best Practices

1. **Principle of Least Privilege**: Only grant necessary permissions
2. **Regular Permission Audits**: Review permissions periodically
3. **Monitor Access**: Log permission checks and access attempts
4. **Use Strong Authentication**: Ensure JWT tokens are properly validated
5. **Limit Admin Access**: Only grant admin permissions to trusted users

## Migration Script

If you need to migrate existing permissions or set up permissions for existing users:

```javascript
// scripts/setup-audit-log-permissions.js
async function setupAuditLogPermissions() {
  // Register permissions
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'read_audit_logs',
      displayName: 'Read audit logs',
      pluginName: 'audit-log'
    },
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'write_audit_logs',
      displayName: 'Write audit logs',
      pluginName: 'audit-log'
    },
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'admin_audit_logs',
      displayName: 'Admin audit logs',
      pluginName: 'audit-log'
    }
  ]);

  // Assign permissions to Super Admin role
  const superAdminRole = await strapi.admin.services.role.findOne(1);
  if (superAdminRole) {
    await strapi.admin.services.permission.createMany([
      {
        action: 'plugin::audit-log.read_audit_logs',
        subject: null,
        properties: {},
        conditions: [],
        role: superAdminRole.id
      },
      {
        action: 'plugin::audit-log.write_audit_logs',
        subject: null,
        properties: {},
        conditions: [],
        role: superAdminRole.id
      },
      {
        action: 'plugin::audit-log.admin_audit_logs',
        subject: null,
        properties: {},
        conditions: [],
        role: superAdminRole.id
      }
    ]);
  }

  console.log('Audit log permissions setup completed');
}

// Run the setup
setupAuditLogPermissions().catch(console.error);
```

This comprehensive setup ensures that your audit log system has proper role-based access control with configurable permissions and security settings.
