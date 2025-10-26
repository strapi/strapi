# Audit Logging for Strapi

## 🧾 Overview
This feature adds **Automated Audit Logging** to Strapi, enabling the system to record all content changes (create, update, delete) performed through the Content API.

Each change is logged in a dedicated collection — `audit_logs` — along with metadata about the user, content type, action type, timestamps, and data differences.

This solution integrates seamlessly with Strapi’s event-driven architecture and respects existing configurations and access control.

---

## ⚙️ Key Features

✅ Automatically logs all **create**, **update**, and **delete** actions from the Content API.  
✅ Stores contextual metadata:
- Content type name  
- Record ID  
- Action type  
- Timestamp  
- Authenticated user (relation to `plugin::users-permissions.user`)  
- Changed fields or payload diff  
✅ Provides a REST endpoint `/audit-logs` with:
- Filtering by content type, user, action type, and date range  
- Pagination and sorting  
✅ Role-based access control:
- Only users with permission `read_audit_logs` can view logs  
✅ Configurable via `config/default.ts`:
```ts
export default {
  auditLog: {
    enabled: true,
    excludeContentTypes: ['plugin::users-permissions.user', 'admin::user'],
  },
};
```

## 🚀 Setup Instructions

- Copy the audit-log folder into src/plugins/ of your Strapi project.

- Enable the plugin in config/plugins.ts:

```
export default {
  'audit-log': { enabled: true },
};
```
- Restart your Strapi server — the plugin will create the audit_logs collection automatically.


## 🏗️ Architectural Overview

### 1. Integration Points

The **Audit Log system** hooks into Strapi’s lifecycle events and **Content API layer**.

- On every **create**, **update**, or **delete** action,  
  the system triggers a `createLog()` call from the audit-log service.
- This call saves a record in `audit_logs` via Strapi’s ORM,  
  including the linked user and metadata.


---

### 📁 Plugin Structure

Located under `src/plugins/audit-log/`:

 ```
├── server/
│   ├── index.ts
│   ├── content-types/
│   │   └── audit-log/schema.json
│   ├── controllers/
│   │   └── audit-log.ts
│   ├── routes/
│   │   └── audit-log.ts
│   ├── policies/
│   │   └── can-read-audit-logs.ts
│   ├── services/
│   │   └── audit-log.ts
│   └── config/
│       └── default.ts

```

---

## 🧩 Implementation Details

### 1. Schema Definition

`audit_logs` is a new collection with proper indexing and relationships:

```json
{
  "kind": "collectionType",
  "collectionName": "audit_logs",
  "info": {
    "singularName": "audit-log",
    "pluralName": "audit-logs",
    "displayName": "Audit Log"
  },
  "attributes": {
    "contentType": { "type": "string", "required": true },
    "recordId": { "type": "string", "required": true },
    "action": {
      "type": "enumeration",
      "enum": ["create", "update", "delete"],
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::users-permissions.user"
    },
    "timestamp": { "type": "datetime", "required": true },
    "diff": { "type": "json" }
  }
}
```

### 2. Lifecycle Hook (Bootstrap)

`index.ts` attaches to Strapi’s event bus:

```
import { Core } from '@strapi/strapi';
import _default from '../server/config/default.js';

const CONFIG_KEY = 'plugin.audit-log';
const config = strapi.config.get(CONFIG_KEY, _default);


export default async ({ strapi }: { strapi: Core.Strapi }) => {

  if (!config.auditLog.enabled) {
    strapi.log.info('Audit logging disabled via configuration.');
    return;
  }

  strapi.log.info('Audit logging initialized.');

  // Hook into Strapi content events
  strapi.db.lifecycles.subscribe({
    async afterCreate(event) {
      await createAuditLog(strapi, event, 'create');
    },
    async afterUpdate(event) {
      await createAuditLog(strapi, event, 'update');
    },
    async afterDelete(event) {
      await createAuditLog(strapi, event, 'delete');
    },
  });
};

// helper
async function createAuditLog(
  strapi: Core.Strapi,
  event: any,
  action: 'create' | 'update' | 'delete'
) {


  const { model, result, params } = event;
  if (config.auditLog.excludeContentTypes?.includes(model.uid)) return;

  const user = params?.user ?? null;

  await strapi.db.query('plugin::audit-log.audit-log').create({
    data: {
      contentType: model.uid,
      recordId: result.id,
      action,
      user: user?.id || null,
      timestamp: new Date(),
      payload: JSON.stringify(result),
    },
  });
}

```
### 3. Audit Log Service

```
import type { Core } from '@strapi/strapi';
import type { AuditLogEntry, AuditLogQuery } from '../types/audit-log.d.ts';
import _default from '../config/default.js';

const CONFIG_KEY = 'plugin.audit-log';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Find audit logs with filters and pagination
   */
  async findWithFilters(query: AuditLogQuery) {
    const {
      page = 1,
      pageSize = 10,
      contentType,
      user,
      action,
      startDate,
      endDate,
    } = query;

    const filters: any = {};
    if (contentType) filters.contentType = contentType;
    if (user) filters.user = user;
    if (action) filters.action = action;
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate);
      if (endDate) filters.timestamp.$lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      strapi.db.query('plugin::audit-log.audit-log').findMany({
        where: filters,
        orderBy: { timestamp: 'DESC' },
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      strapi.db.query('plugin::audit-log.audit-log').count({ where: filters }),
    ]);

    return {
      entries,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  },

  /**
   * Create a new audit log entry for a content change
   */
  async createLog(params: {
    contentType: string;
    recordId: string | number;
    action: 'create' | 'update' | 'delete';
    userId?: number;
    diff?: Record<string, any>;
  }) {
    const { contentType, recordId, action, userId, diff } = params;
    const config = strapi.config.get(CONFIG_KEY, _default);

    // Skip logging if disabled or excluded
    if (!config.auditLog.enabled) return;
    if (config.auditLog.excludeContentTypes?.includes(contentType)) return;

    const entry: AuditLogEntry = {
      contentType,
      recordId: recordId.toString(),
      action,
      timestamp: new Date(),
      diff: diff || {},
    };

    if (userId) {
      entry.user = userId;
    }

    try {
      await strapi.db.query('plugin::audit-log.audit-log').create({
        data: entry,
      });
    } catch (error) {
      strapi.log.error('Failed to create audit log:', error);
    }
  },
});

```

### 4. Controller

```
import { Core } from '@strapi/strapi';
import { Context } from 'koa';
import { AuditLogQuery } from '../types/audit-log';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async find(ctx: Context) {
    const query = ctx.request.query as unknown as AuditLogQuery;

    const data = await strapi
      .plugin('audit-log')
      .service('audit-log')
      .findWithFilters(query);

    ctx.body = data;
  },
});
```

### 5. Access Control Middleware

`can-read-audit-logs.ts` add role-based access control:

```
import { Core } from '@strapi/strapi';
import { Context, Next } from 'koa';

export default async (ctx: Context, next: Next) => {
  const user = ctx.state.user;
  if (!user) {
    return ctx.unauthorized('You must be logged in.');
  }

  // permission check for read_audit_logs
  const hasPermission = await strapi
    .plugin('users-permissions')
    .service('user')
    .hasPermission(user.id, 'read_audit_logs');

  if (!hasPermission) {
    return ctx.forbidden('You are not allowed to read audit logs.');
  }

  await next();
};

```

## 🧮 Query Examples

### Get All Audit Logs
```http
GET /audit-logs?page=1&pageSize=10
```
### Filter by User
```http
GET /audit-logs?startDate=2025-10-01&endDate=2025-10-26
```

## 🧰 Configuration Options

| Key | Type | Description |
|-----|------|-------------|
| `auditLog.enabled` | `boolean` | Enables or disables logging globally |
| `auditLog.excludeContentTypes` | `string[]` | Content types to exclude from logging |

## 🔐 Access Control

Only users with the read_audit_logs permission can query /audit-logs.
All other users will receive a 403 Forbidden response.
