# Strapi Audit Log Plugin

This plugin provides automated audit logging for all content changes performed through Strapi's Content API. It captures key metadata for every create, update, and delete operation, and provides a REST endpoint to retrieve, filter, and paginate audit logs.

## Features

*   **Automated Logging:** Automatically creates an audit log entry for `create`, `update`, and `delete` operations on content types via the Content API.
*   **Detailed Log Entries:** Each log entry includes:
    *   Content type name and record ID
    *   Action type (create, update, delete)
    *   Timestamp
    *   User ID (if authenticated)
    *   Changed fields or full payload depending on action type
*   **REST API Endpoint:** `/audit-logs` endpoint to retrieve, filter, and paginate audit logs.
    *   Supports filtering by: Content type, User ID, Action type, Date range.
    *   Supports pagination and sorting.
*   **Access Control:** Role-based access control for the `/audit-logs` endpoint (`read_audit_logs` permission).
*   **Configuration Options:**
    *   `auditLog.enabled`: Enable or disable logging globally.
    *   `auditLog.excludeContentTypes`: Specify content types to exclude from logging.

## Installation

1.  **Create the plugin:**
    ```bash
    # Assuming you are in the root of your Strapi project
    yarn strapi generate
    # Select 'plugin' and name it 'audit-log'
    ```
2.  **Install dependencies:**
    ```bash
    yarn install
    ```
3.  **Build the project:**
    ```bash
    yarn build
    ```
4.  **Enable the plugin:**
    Add the following to `./config/plugins.js` (create if it doesn't exist):
    ```javascript
    module.exports = ({ env }) => ({
      // ... other plugins
      'audit-log': {
        enabled: true,
      },
    });
    ```

## Usage

### Audit Log Entries

Audit log entries are automatically created when content is modified via the Content API.

### REST API

You can access the audit logs via the `/audit-logs` endpoint.

**GET /api/audit-logs**

Retrieve a list of audit logs.

#### Query Parameters

*   `filters[contentType][$eq]`: Filter by content type name (e.g., `product`).
*   `filters[userId][$eq]`: Filter by user ID.
*   `filters[action][$eq]`: Filter by action type (`create`, `update`, `delete`).
*   `filters[createdAt][$gte]`: Filter by start date (e.g., `2023-01-01T00:00:00Z`).
*   `filters[createdAt][$lte]`: Filter by end date (e.g., `2023-12-31T23:59:59Z`).
*   `pagination[page]`: Page number (default: 1).
*   `pagination[pageSize]`: Number of entries per page (default: 10).
*   `sort`: Sorting criteria (e.g., `createdAt:desc`).

#### Example Request

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[contentType][$eq]=product&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=5" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Access Control

To grant users access to the `/audit-logs` endpoint:

1.  Go to the Strapi Admin Panel -> Settings -> Roles.
2.  Select the role you want to edit.
3.  Under "Plugins", find "Audit Log" and enable the "Read Audit Logs" permission.

### Configuration

You can configure the plugin in `./config/plugins.js`:

```javascript
module.exports = ({ env }) => ({
  'audit-log': {
    enabled: env.bool('AUDIT_LOG_ENABLED', true), // Enable/disable globally
    excludeContentTypes: ['admin::user', 'admin::role'], // Content types to exclude from logging
  },
});
```

## Architectural Overview

Refer to `DESIGN_NOTE.md` for a detailed architectural overview and implementation approach.
