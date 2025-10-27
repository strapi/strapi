# DESIGN_NOTE.md

## 1. Overview
Plugin `audit-log` registers lifecycle hooks for all content types and stores audit entries in a new collection `audit_logs`.
The purpose of this plugin is to automatically log every content modification done via Strapi’s Content API. This ensures traceability, accountability, and compliance for all content operations.

## 2. Goals
The system:
-Tracks create, update, and delete events
-Records user, timestamp, content type, record ID, and changed data/diff
-Provides a /audit-logs API endpoint with filtering, sorting, and pagination
-Enforces RBAC permission control
-Supports global enable/disable & content-type exclusions

## 3. Architectural Overview: Audit Logging System in Strapi

- High-Level Architecture
┌───────────────────────────────┐
│         HTTP Request          │
│  (REST API via Content API)  │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Strapi Middleware Layer     │◄── Captures user info (ctx.state.user)
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│     Core Entity Service       │
│ (create, update, delete ops) │
└──────────────┬────────────────┘
               │ triggers
               ▼
┌───────────────────────────────┐
│    Lifecycle Event Hooks      │◄── afterCreate, afterUpdate, afterDelete
│  (Attached by our plugin)     │
└──────────────┬────────────────┘
               │ writes audit log
               ▼
┌───────────────────────────────┐
│    audit_logs Collection      │
│ (Database table with indexes) │
└───────────────────────────────┘

The audit logging system is implemented as a custom Strapi plugin (/plugins/audit-log) that integrates deeply into Strapi’s request lifecycle using lifecycles, middleware, and core services interception.

This system intercepts every create, update, and delete operation triggered through the Content API and automatically records metadata into a dedicated audit_logs collection.

## 4. Components Integrated with Strapi:
Layer	Purpose
Plugin Registration	Registers controllers, services, routes, and content-types dynamically
Middleware Hook	Detects operations before persistence
Lifecycles API	Captures create/update/delete events per content-type
RBAC Permissions	Restricts access to audit log endpoint
Config System	Allows enabling/disabling & content-type exclusions
REST Endpoint	Provides audit log fetching with filters + pagination

## 5. Internal Architecture Breakdown
-5.1 Audit Log Storage

A new Strapi collection-type called audit-log is defined in the plugin.
Records are stored in the database with indexes on:
-content_type
-action
-user_id
-timestamp
-Optimized for querying and pagination.

Example Audit Entry Structure:
{
  "id": 1,
  "content_type": "api::article.article",
  "record_id": 24,
  "action": "update",
  "timestamp": "2025-01-01T12:30:00.000Z",
  "user_id": 3,
  "payload_diff": { "title": { "old": "Old", "new": "New" } }
}

-5.2 Event Capturing Mechanism

The system uses two key integration points:

A. Lifecycle Hooks

Located under:
/plugins/audit-log/server/lifecycles/*.js

Strapi triggers lifecycles whenever content is created, updated, or deleted.

Our plugin attaches listeners via the bootstrap() function.

Each lifecycle passes event data such as params.where.id and result.

Advantages:
-Native Strapi integration
-No modification to core code

B. Request Context (User Info)

Strapi stores authenticated user data under ctx.state.user.
We attach request-level data using middleware so the log includes:

Metadata	Source
User	ctx.state.user
Timestamp	new Date()
Action Type	Derived from lifecycle hook
Changed Fields	Compared before+after data

-5.3 Configuration System

Located under:
/plugins/audit-log/server/config

Available Options:
Key	Type	Description
auditLog.enabled	Boolean	Enable or disable logging globally
auditLog.excludeContentTypes	Array	Prevent logging on specific content types

These settings can be changed in config/plugins.js.

-5.4 Audit Log Retrieval API

The plugin exposes the route:

GET /api/audit-logs

Supported Query Parameters:
Query	Description	Example
contentType	Filter by content type	api::article.article
userId	Filter by user	3
action	create/update/delete action	update
startDate / endDate	Filter by time range	ISO timestamps
_limit / _start	Pagination	_limit=10&_start=0
_sort	Sorting	_sort=timestamp:desc

Built using Strapi’s core query engine, ensuring database agnosticism.

-5.5 Access Control & Permissions

A custom permission plugin::audit-log.read is added.
Only roles with this permission can access /audit-logs.
RBAC is fully integrated with Strapi’s permission engine.

## 6. Detailed Implementation Flow
6.1 User triggers API action

E.g., POST /api/articles or PUT /api/articles/1

6.2 Strapi executes core logic

Content is validated and persisted via the entity service.

6.3 Lifecycle Event Fires

Our plugin's lifecycle hooks listen to:

-afterCreate
-afterUpdate
-afterDelete

6.4 Audit Entry Created

-Extract metadata (record ID, action, timestamp)
-Capture before state (for diff)
-Save into audit_logs collection

6.5 REST Access

Authorized users can query logs via secure API.

## 7. Key Components
Component	Description
Plugin Bootstrap	Registers lifecycle hooks dynamically for all content types
Lifecycle Listeners	Listen to create, update, delete events
Audit Service	Normalizes diff data & persists logs
API Controller	Handles /audit-logs endpoint with filtering & pagination
RBAC Integration	Restricts access to logs via read_audit_logs permission
Config System	Handles auditLog.enabled and auditLog.excludeContentTypes

## 8. Audit Log Data Model
Field	Type	Description
id	Integer / UUID	Primary key
contentType	String	e.g., api::article.article
recordId	String/Int	ID of the record modified
action	Enum: create, update, delete	
user	Relation/User ID	Null if unauthenticated
timestamp	

## 9. Future improvements
- Add admin UI plugin for browsing/filtering logs.
- Add streaming to object storage or search engine (Elastic/Opensearch) for retention and search.
- Add redaction rules for PII fields.