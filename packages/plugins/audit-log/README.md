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

Retrieve a list of audit log entries with support for filtering, sorting, and pagination.

#### Query Parameters

| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `sort` | `string` | Sort the results. Use format `field:asc` or `field:desc`. | `createdAt:desc` |
| `pagination[page]` | `integer` | The page number to retrieve. | `1` |
| `pagination[pageSize]` | `integer` | The number of items to return per page. | `25` |
| `filters[action][$eq]` | `string` | Filter by action type. Must be `create`, `update`, or `delete`. | `update` |
| `filters[contentType][$eq]`| `string` | Filter by the singular name of the content type. | `product` |
| `filters[recordId][$eq]` | `string` \| `integer` | Filter by the ID of the content entry that was changed. | `42` |
| `filters[userId][$eq]` | `string` \| `integer` | Filter by the ID of the admin user who performed the action. | `1` |
| `filters[createdAt][$gte]` | `string` | Filter for entries created on or after a specific ISO 8601 date. | `2024-01-01T00:00:00Z` |
| `filters[createdAt][$lte]` | `string` | Filter for entries created on or before a specific ISO 8601 date. | `2024-01-31T23:59:59Z` |

#### Example Request

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[contentType][$eq]=article&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=10" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

#### Success Response (200 OK)

The response body is a JSON object containing `data` and `meta` properties. The following examples show responses for different action types.

##### Action: 'update'

**Example Request**

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[action][$eq]=update" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Example Response Body**

```json
{
  "data": [
    {
      "id": 101,
      "action": "update",
      "contentType": "article",
      "recordId": "23",
      "userId": "1",
      "payload": {
        "before": { "title": "Old Title" },
        "after": { "title": "New Title" }
      },
      "createdAt": "2024-02-15T10:30:00.123Z",
      "updatedAt": "2024-02-15T10:30:00.123Z"
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

##### Action: 'create'

**Example Request**

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[action][$eq]=create" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Example Response Body**

```json
{
  "data": [
    {
      "id": 102,
      "action": "create",
      "contentType": "article",
      "recordId": "24",
      "userId": "1",
      "payload": {
        "after": { "title": "A Brand New Article" }
      },
      "createdAt": "2024-02-15T11:00:00.456Z",
      "updatedAt": "2024-02-15T11:00:00.456Z"
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

##### Action: 'delete'

**Example Request**

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[action][$eq]=delete" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Example Response Body**

```json
{
  "data": [
    {
      "id": 103,
      "action": "delete",
      "contentType": "article",
      "recordId": "22",
      "userId": "2",
      "payload": {},
      "createdAt": "2024-02-15T11:30:00.789Z",
      "updatedAt": "2024-02-15T11:30:00.789Z"
    }
  ],
  "meta": { "pagination": { "page": 1, "pageSize": 25, "pageCount": 1, "total": 1 } }
}
```

##### Filtering by User and Date Range

You can combine filters to create more specific queries.

**Example Request**

```bash
curl -X GET "http://localhost:1337/api/audit-logs?filters[userId][$eq]=1&filters[createdAt][$gte]=2024-02-15T10:00:00.000Z&filters[createdAt][$lte]=2024-02-15T12:00:00.000Z&sort=createdAt:asc" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**Example Response Body**

```json
{
  "data": [
    {
      "id": 101,
      "action": "update",
      "contentType": "article",
      "recordId": "23",
      "userId": "1",
      "payload": {
        "before": { "title": "Old Title" },
        "after": { "title": "New Title" }
      },
      "createdAt": "2024-02-15T10:30:00.123Z",
      "updatedAt": "2024-02-15T10:30:00.123Z"
    },
    {
      "id": 102,
      "action": "create",
      "contentType": "article",
      "recordId": "24",
      "userId": "1",
      "payload": {
        "after": { "title": "A Brand New Article" }
      },
      "createdAt": "2024-02-15T11:00:00.456Z",
      "updatedAt": "2024-02-15T11:00:00.456Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 2
    }
  }
}
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
