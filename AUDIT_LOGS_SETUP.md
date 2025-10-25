# Strapi Audit Logs Plugin - Setup & Integration Guide

This guide explains how to set up and use the Audit Logs plugin that has been developed as part of the Strapi assignment.

## 📁 Plugin Location

The plugin is located at:
```
packages/plugins/audit-logs/
```

## 🚀 Quick Start

### 1. Build the Plugin

From the project root:

```bash
# Install dependencies (if not already done)
yarn install

# Build the audit-logs plugin
cd packages/plugins/audit-logs
yarn build
```

### 2. Enable in a Strapi Project

To use this plugin in a Strapi application (e.g., one of the example projects):

#### Option A: Use Example Project

```bash
# Navigate to an example project
cd examples/empty

# Add plugin configuration
```

Create or modify `config/plugins.js` (or `config/plugins.ts`):

```javascript
module.exports = {
  'audit-logs': {
    enabled: true,
    resolve: './node_modules/@strapi/plugin-audit-logs', // or use workspace: protocol
    config: {
      // Optional configuration
      enabled: true,
      excludeContentTypes: [],
      retentionDays: null,
    },
  },
};
```

#### Option B: For Development (Monorepo)

The plugin is already part of the monorepo. To test it:

```bash
# From project root, link the plugins
yarn link

# Navigate to an example project
cd examples/empty

# Start the development server
yarn develop
```

### 3. Run Strapi

```bash
# From the example project directory
yarn develop
```

### 4. Configure Permissions

1. Open the Strapi admin panel (http://localhost:1337/admin)
2. Navigate to **Settings** → **Roles** (Administration Panel section)
3. Select a role (e.g., **Super Admin**)
4. Scroll to **Plugins** → **Audit Logs**
5. Enable the **Read** permission
6. Click **Save**

### 5. Test the Plugin

#### Create/Update Content

1. Create or modify any content type through the Content Manager
2. The audit log will be automatically created

#### Access Audit Logs

**Via API:**

```bash
# Get all audit logs
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# Filter by content type
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs?contentType=api::article.article' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'

# Get statistics
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs/stats' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

## 📚 Documentation

- **Plugin README**: [`packages/plugins/audit-logs/README.md`](packages/plugins/audit-logs/README.md) - Comprehensive usage guide
- **Design Document**: [`DESIGN_NOTE.md`](DESIGN_NOTE.md) - Architecture and implementation details

## 🎯 Features Implemented

✅ **Automated Audit Logging**
- Captures all content changes automatically
- Tracks create, update, delete, publish, and unpublish operations
- Uses Strapi's lifecycle hooks and document middleware

✅ **Comprehensive Metadata**
- Content type name and record ID
- Action type
- Timestamp with millisecond precision
- User information (ID, name, email)
- Changed fields (for updates)
- Previous and new data snapshots

✅ **REST API Endpoint**
- GET `/api/audit-logs/audit-logs` - List all logs
- GET `/api/audit-logs/audit-logs/:id` - Get single log
- GET `/api/audit-logs/audit-logs/stats` - Get statistics

✅ **Filtering & Querying**
- Filter by content type
- Filter by user ID
- Filter by action type
- Filter by date range
- Pagination support (page, pageSize)
- Sorting (by any field)

✅ **Access Control**
- Role-based permissions
- Custom `plugin::audit-logs.read` permission
- Admin authentication required

✅ **Configuration Options**
- `enabled` - Enable/disable logging globally
- `excludeContentTypes` - Exclude specific content types
- `capturePayload` - Control payload capture
- `retentionDays` - Automatic cleanup of old logs

✅ **Security**
- Automatic sanitization of sensitive fields
- Prevents infinite loops (excludes own content type)
- Proper permission checks on all endpoints

✅ **Performance Optimizations**
- Database indexing on common query fields
- Non-blocking audit logging
- Pagination to prevent large result sets
- Optional retention policy for cleanup

## 🏗️ Architecture

### Plugin Structure

```
audit-logs/
├── server/
│   └── src/
│       ├── content-types/          # Audit log content type
│       ├── controllers/            # API request handlers
│       ├── routes/                 # API route definitions
│       ├── services/               # Business logic
│       ├── config/                 # Configuration with validation
│       ├── bootstrap.ts            # Lifecycle hooks registration
│       ├── register.ts             # Permission registration
│       └── utils.ts                # Helper functions
├── admin/                          # Admin panel integration
├── package.json
├── README.md
└── rollup.config.mjs              # Build configuration
```

### Key Components

1. **Content Type**: `audit-log` schema with all necessary fields
2. **Lifecycle Hooks**: 
   - Database lifecycle subscribers
   - Document service middleware
3. **Services**: Business logic for creating and querying logs
4. **Controllers**: HTTP request handlers
5. **Routes**: Protected API endpoints
6. **Configuration**: Runtime settings with validation

## 🔒 Security Features

- **Data Sanitization**: Automatically redacts passwords and tokens
- **Access Control**: Role-based permissions
- **Audit Log Integrity**: Read-only logs (no update/delete)
- **SQL Injection Prevention**: Uses ORM with parameterized queries

## ⚡ Performance Considerations

- **Indexes**: Automatic indexing on contentType, recordId, action, userId, timestamp
- **Pagination**: Default 25 per page, max 100
- **Non-Blocking**: Failed audit logs don't break operations
- **Cleanup**: Optional auto-cleanup via cron job
- **Exclusions**: Can exclude high-volume content types

## 🧪 Testing the Implementation

### Manual Testing Checklist

1. **Create Operation**
   ```bash
   # Create a new article
   POST /api/articles
   # Check audit log
   GET /api/audit-logs/audit-logs?action=create
   ```

2. **Update Operation**
   ```bash
   # Update an article
   PUT /api/articles/1
   # Check audit log shows changed fields
   GET /api/audit-logs/audit-logs?action=update
   ```

3. **Delete Operation**
   ```bash
   # Delete an article
   DELETE /api/articles/1
   # Check audit log
   GET /api/audit-logs/audit-logs?action=delete
   ```

4. **Filtering**
   ```bash
   # Filter by content type
   GET /api/audit-logs/audit-logs?contentType=api::article.article
   
   # Filter by date range
   GET /api/audit-logs/audit-logs?startDate=2024-10-01&endDate=2024-10-31
   
   # Combine filters
   GET /api/audit-logs/audit-logs?contentType=api::article.article&action=update&userId=1
   ```

5. **Pagination**
   ```bash
   # Get page 2 with 10 items
   GET /api/audit-logs/audit-logs?page=2&pageSize=10
   ```

6. **Statistics**
   ```bash
   # Get overall stats
   GET /api/audit-logs/audit-logs/stats
   ```

7. **Permissions**
   - Try accessing without permission → Should fail
   - Grant permission → Should succeed

## 📝 Configuration Examples

### Basic Configuration

```javascript
// config/plugins.js
module.exports = {
  'audit-logs': {
    enabled: true,
  },
};
```

### Advanced Configuration

```javascript
// config/plugins.js
module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      // Enable audit logging
      enabled: true,
      
      // Exclude high-volume content types
      excludeContentTypes: [
        'api::session.session',
        'api::analytics.analytics',
      ],
      
      // Capture full request payload
      capturePayload: true,
      
      // Auto-cleanup logs older than 90 days
      retentionDays: 90,
    },
  },
};
```

### Environment-Specific Configuration

```javascript
// config/plugins.js
module.exports = ({ env }) => ({
  'audit-logs': {
    enabled: true,
    config: {
      enabled: env.bool('AUDIT_LOGS_ENABLED', true),
      retentionDays: env.int('AUDIT_LOGS_RETENTION_DAYS', null),
      excludeContentTypes: env.array('AUDIT_LOGS_EXCLUDE', []),
    },
  },
});
```

## 🐛 Troubleshooting

### Audit Logs Not Appearing

1. Check if plugin is enabled in config
2. Verify the content type is not excluded
3. Check user has permissions
4. Look at Strapi logs for errors

### Performance Issues

1. Set a retention policy to limit table size
2. Exclude high-volume content types
3. Ensure database indexes are created
4. Consider disabling payload capture

### Permission Errors

1. Ensure user is authenticated
2. Check role has `plugin::audit-logs.read` permission
3. Verify routes are protected with correct policies

## 🔄 Database Schema

The plugin creates an `audit_logs` table with the following structure:

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  document_id VARCHAR(255),
  content_type VARCHAR(255) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  user_id INTEGER,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  changed_fields JSON,
  previous_data JSON,
  new_data JSON,
  payload JSON,
  timestamp DATETIME NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  created_by_id INTEGER,
  updated_by_id INTEGER
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_content_type ON audit_logs(content_type);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## 📊 Example API Responses

### List Audit Logs

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "contentType": "api::article.article",
      "recordId": "10",
      "action": "update",
      "userId": 1,
      "userName": "admin",
      "userEmail": "admin@example.com",
      "changedFields": ["title", "content"],
      "previousData": {
        "title": "Old Title"
      },
      "newData": {
        "title": "New Title"
      },
      "timestamp": "2024-10-25T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 3,
      "total": 67
    }
  }
}
```

### Statistics

```json
{
  "data": {
    "total": 1523,
    "byAction": {
      "create": 542,
      "update": 823,
      "delete": 98,
      "publish": 45,
      "unpublish": 15
    },
    "byContentType": {
      "api::article.article": 856,
      "api::page.page": 342,
      "api::comment.comment": 325
    }
  }
}
```

## 🚢 Deployment Considerations

### Production Checklist

- [ ] Set appropriate retention policy
- [ ] Exclude high-volume content types
- [ ] Configure database backups (include audit_logs)
- [ ] Set up monitoring for table size
- [ ] Review and test permissions
- [ ] Consider database partitioning for large datasets
- [ ] Set up alerts for audit log failures

### Scaling

For high-volume deployments:
1. Use database read replicas for queries
2. Partition the audit_logs table by date
3. Consider async logging with a queue (future enhancement)
4. Set aggressive retention policies

## 📞 Support & Contributing

For issues or questions:
- Review the [README](packages/plugins/audit-logs/README.md)
- Check the [DESIGN_NOTE](DESIGN_NOTE.md)
- Submit issues or PRs following Strapi's contribution guidelines

## ✅ Assignment Completion Checklist

All requirements met:

- ✅ Automated audit logging for all content changes
- ✅ Captures comprehensive metadata (user, content type, timestamps, diff)
- ✅ REST endpoint `/audit-logs` with filtering, pagination, sorting
- ✅ Role-based access control with `read_audit_logs` permission
- ✅ Configuration options: `enabled`, `excludeContentTypes`
- ✅ Comprehensive README with architectural overview
- ✅ Detailed DESIGN_NOTE.md with implementation approach
- ✅ Production-ready code with proper error handling
- ✅ Security considerations (sanitization, permissions)
- ✅ Performance optimizations (indexing, pagination, exclusions)
- ✅ Seamless integration with Strapi architecture

---

**Assignment completed by**: Abhishek Jaiswal
**Date**: October 25, 2024
**Plugin Version**: 1.0.0

