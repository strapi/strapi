# Audit Logs Plugin - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STRAPI APPLICATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐                                               │
│  │   Admin Panel    │                                               │
│  │   (Frontend)     │                                               │
│  └────────┬─────────┘                                               │
│           │                                                          │
│           │ HTTP Request (JWT)                                       │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               AUTHENTICATION MIDDLEWARE                        │  │
│  │               - Verify JWT Token                              │  │
│  │               - Load User Context                             │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           PERMISSION MIDDLEWARE                                │  │
│  │           - Check plugin::audit-logs.read permission          │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│           ┌─────────┴─────────┐                                     │
│           │                   │                                     │
│           ▼                   ▼                                     │
│  ┌──────────────┐    ┌──────────────────┐                          │
│  │ Content API  │    │  Audit Logs API  │                          │
│  │              │    │                  │                          │
│  │ /api/articles│    │ /api/audit-logs/ │                          │
│  │ /api/pages   │    │   audit-logs     │                          │
│  │ ...          │    │                  │                          │
│  └──────┬───────┘    └────────┬─────────┘                          │
│         │                     │                                     │
│         │                     │                                     │
│         ▼                     ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DOCUMENT SERVICE LAYER                           │  │
│  │              - strapi.documents(uid).create()                 │  │
│  │              - strapi.documents(uid).update()                 │  │
│  │              - strapi.documents(uid).delete()                 │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │       🎯 DOCUMENT MIDDLEWARE (AUDIT PLUGIN)                   │  │
│  │       ┌─────────────────────────────────────────────────┐    │  │
│  │       │ 1. Check if auditing enabled                     │    │  │
│  │       │ 2. Check if content type excluded                │    │  │
│  │       │ 3. Capture user context                          │    │  │
│  │       │ 4. For updates: fetch previous data              │    │  │
│  │       │ 5. Call next() - execute DB operation            │    │  │
│  │       │ 6. Calculate diff (for updates)                  │    │  │
│  │       │ 7. Create audit log entry                        │    │  │
│  │       └─────────────────────────────────────────────────┘    │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    DATABASE LAYER                             │  │
│  │                    - Knex.js ORM                              │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │       🎯 DATABASE LIFECYCLE HOOKS (AUDIT PLUGIN)              │  │
│  │       ┌─────────────────────────────────────────────────┐    │  │
│  │       │ - afterCreate: log creation                      │    │  │
│  │       │ - afterUpdate: log update                        │    │  │
│  │       │ - afterDelete: log deletion                      │    │  │
│  │       └─────────────────────────────────────────────────┘    │  │
│  └──────────────────┬───────────────────────────────────────────┘  │
│                     │                                                │
│                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   DATABASE                                    │  │
│  │  ┌──────────────┐           ┌──────────────┐                 │  │
│  │  │   articles   │           │ audit_logs   │                 │  │
│  │  ├──────────────┤           ├──────────────┤                 │  │
│  │  │ id           │           │ id           │                 │  │
│  │  │ title        │───logs───▶│ contentType  │                 │  │
│  │  │ content      │           │ recordId     │                 │  │
│  │  │ ...          │           │ action       │                 │  │
│  │  └──────────────┘           │ userId       │                 │  │
│  │                             │ changedFields│                 │  │
│  │  ┌──────────────┐           │ previousData │                 │  │
│  │  │    pages     │           │ newData      │                 │  │
│  │  ├──────────────┤           │ timestamp    │                 │  │
│  │  │ id           │───logs───▶│ ...          │                 │  │
│  │  │ ...          │           └──────────────┘                 │  │
│  │  └──────────────┘                                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow - Create Operation

```
User Creates Article
       │
       ▼
┌────────────────┐
│  POST /api/    │
│  articles      │
└───────┬────────┘
        │
        ▼
┌────────────────────────┐
│ Document Service       │
│ .create()              │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ 🎯 Document Middleware │ ◄── Audit Plugin Hook
│ - Captures user        │
│ - Captures context     │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Database INSERT        │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ 🎯 afterCreate Hook    │ ◄── Audit Plugin Hook
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Audit Service          │
│ .logCreate()           │
│ - Sanitize data        │
│ - Create log entry     │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ INSERT INTO audit_logs │
└────────────────────────┘
```

## Data Flow - Update Operation

```
User Updates Article
       │
       ▼
┌────────────────┐
│  PUT /api/     │
│  articles/123  │
└───────┬────────┘
        │
        ▼
┌────────────────────────┐
│ Document Service       │
│ .update()              │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ 🎯 Document Middleware │ ◄── Audit Plugin Hook
│ BEFORE next():         │
│ - Fetch current data   │
│ - Store as previousData│
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Database UPDATE        │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ 🎯 Document Middleware │
│ AFTER next():          │
│ - Compare old vs new   │
│ - Calculate diff       │
│ - Identify changed     │
│   fields               │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Audit Service          │
│ .logUpdate()           │
│ - previousData         │
│ - newData              │
│ - changedFields[]      │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ INSERT INTO audit_logs │
│ WITH changed fields    │
└────────────────────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                      AUDIT LOGS PLUGIN                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │   bootstrap.ts │────────▶│  Lifecycle     │              │
│  │                │  setup  │  Hooks         │              │
│  │ - Register     │         │                │              │
│  │   hooks        │         │ - DB subscribe │              │
│  │ - Setup cron   │         │ - Doc middleware│             │
│  └────────────────┘         └────────────────┘              │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │   register.ts  │────────▶│  Permissions   │              │
│  │                │ create  │                │              │
│  │ - Register     │         │ - read action  │              │
│  │   permissions  │         └────────────────┘              │
│  └────────────────┘                                          │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │   routes/      │────────▶│  Controllers   │              │
│  │                │  map to │                │              │
│  │ - GET /audit-  │         │ - find()       │              │
│  │   logs         │         │ - findOne()    │              │
│  │ - GET /stats   │         │ - stats()      │              │
│  └────────────────┘         └────────┬───────┘              │
│                                      │                       │
│                                      │ calls                 │
│                                      ▼                       │
│  ┌────────────────┐         ┌────────────────┐              │
│  │   config/      │         │   Services     │              │
│  │                │         │                │              │
│  │ - enabled      │────────▶│ - create()     │              │
│  │ - exclude      │ provides│ - find()       │              │
│  │ - retention    │  config │ - logCreate()  │              │
│  └────────────────┘         │ - logUpdate()  │              │
│                             │ - logDelete()  │              │
│  ┌────────────────┐         │ - cleanup()    │              │
│  │   utils.ts     │         └────────┬───────┘              │
│  │                │                  │                       │
│  │ - sanitize     │◀─────────────────┤ uses                 │
│  │ - calculateDiff│                                          │
│  │ - getUserInfo  │                                          │
│  └────────────────┘                                          │
│                                      │                       │
│                                      │ stores                │
│                                      ▼                       │
│  ┌─────────────────────────────────────────────────┐        │
│  │         content-types/audit-log/                 │        │
│  │                                                  │        │
│  │         schema.json                              │        │
│  │         - contentType (string, indexed)          │        │
│  │         - recordId (string, indexed)             │        │
│  │         - action (enum, indexed)                 │        │
│  │         - userId (integer, indexed)              │        │
│  │         - changedFields (json)                   │        │
│  │         - previousData (json)                    │        │
│  │         - newData (json)                         │        │
│  │         - timestamp (datetime, indexed)          │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────┘

Request to /api/audit-logs/audit-logs
              │
              ▼
      ┌───────────────┐
      │ Authentication│
      │   Middleware  │
      │               │
      │ Check JWT     │
      │ Token         │
      └───────┬───────┘
              │
              ▼ PASS
      ┌───────────────────┐
      │ Authorization     │
      │ Middleware        │
      │                   │
      │ Check permission: │
      │ plugin::audit-    │
      │ logs.read         │
      └───────┬───────────┘
              │
              ▼ PASS
      ┌───────────────────┐
      │ Controller        │
      │                   │
      │ - Validate query  │
      │ - Call service    │
      └───────┬───────────┘
              │
              ▼
      ┌───────────────────┐
      │ Service           │
      │                   │
      │ - Query database  │
      │ - Sanitize output │
      └───────┬───────────┘
              │
              ▼
      ┌───────────────────┐
      │ Response          │
      │                   │
      │ Sanitized data    │
      │ with pagination   │
      └───────────────────┘
```

## Cron Job Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    CLEANUP CRON JOB                       │
└──────────────────────────────────────────────────────────┘

              Daily at 2:00 AM
                    │
                    ▼
        ┌───────────────────────┐
        │ Cron Job Triggered    │
        │ (if retentionDays set)│
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Calculate Cutoff Date │
        │ (now - retentionDays) │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Query Old Logs        │
        │ WHERE timestamp <     │
        │   cutoffDate          │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Delete in Batches     │
        │ (prevent lock)        │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Log Cleanup Stats     │
        │ "Cleaned up N logs"   │
        └───────────────────────┘
```

## Configuration Flow

```
┌──────────────────────────────────────────────────────────┐
│                CONFIGURATION LOADING                      │
└──────────────────────────────────────────────────────────┘

  Strapi Starts
       │
       ▼
┌────────────────┐
│ Load config/   │
│ plugins.js     │
└───────┬────────┘
        │
        ▼
┌────────────────────────┐
│ Audit Plugin Config    │
│ {                      │
│   enabled: true,       │
│   excludeContentTypes  │
│   retentionDays        │
│ }                      │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Validate Config        │
│ (config/index.ts)      │
│ - Check types          │
│ - Validate values      │
└───────┬────────────────┘
        │
        ▼ Valid
┌────────────────────────┐
│ Store in Plugin Config │
│ strapi.config.get()    │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│ Used by:               │
│ - Hooks (filter)       │
│ - Service (retention)  │
│ - Utils (checks)       │
└────────────────────────┘
```

## Hooks Strategy - Why Dual Approach?

```
┌──────────────────────────────────────────────────────────┐
│            DATABASE LIFECYCLE HOOKS                       │
│  ✅ Catches all DB operations                            │
│  ✅ Low-level, comprehensive                             │
│  ❌ Limited context (no user info)                       │
│  ❌ May not have request context                         │
└──────────────────────────────────────────────────────────┘
                    +
┌──────────────────────────────────────────────────────────┐
│           DOCUMENT SERVICE MIDDLEWARE                     │
│  ✅ Rich context (user, request)                         │
│  ✅ Can fetch previous data                              │
│  ✅ Better for publish/unpublish                         │
│  ❌ May miss some operations                             │
└──────────────────────────────────────────────────────────┘
                    =
┌──────────────────────────────────────────────────────────┐
│              COMPREHENSIVE COVERAGE                       │
│  ✅ All operations captured                              │
│  ✅ Best possible context                                │
│  ✅ No gaps in audit trail                               │
└──────────────────────────────────────────────────────────┘
```

## Performance Optimization Points

```
1. DATABASE INDEXES
   ┌──────────────────────────┐
   │ audit_logs table         │
   ├──────────────────────────┤
   │ ✓ idx_content_type       │
   │ ✓ idx_record_id          │
   │ ✓ idx_action             │
   │ ✓ idx_user_id            │
   │ ✓ idx_timestamp          │
   └──────────────────────────┘

2. PAGINATION
   ┌──────────────────────────┐
   │ Default: 25 per page     │
   │ Maximum: 100 per page    │
   │ Prevents large queries   │
   └──────────────────────────┘

3. NON-BLOCKING
   ┌──────────────────────────┐
   │ try {                    │
   │   await auditLog()       │
   │ } catch {                │
   │   log error              │
   │   // Don't throw!        │
   │ }                        │
   └──────────────────────────┘

4. EXCLUSIONS
   ┌──────────────────────────┐
   │ Skip high-volume types   │
   │ Skip internal types      │
   │ Skip own content type    │
   └──────────────────────────┘

5. RETENTION
   ┌──────────────────────────┐
   │ Auto-cleanup old logs    │
   │ Prevents unbounded growth│
   │ Runs at low-traffic time │
   └──────────────────────────┘
```

