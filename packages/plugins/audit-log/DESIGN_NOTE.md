# Design Note: Audit Log Plugin

## Architecture

**Plugin Type:** Internal plugin (always enabled)  
**Location:** `packages/plugins/audit-log/`  
**Storage:** Database table `audit_logs`

## Design Decisions

### 1. Plugin vs Core Service
**Chosen:** Plugin  
**Why:** Better separation, follows Strapi's architecture (like i18n, upload)

### 2. Internal vs Optional Plugin
**Chosen:** Internal (INTERNAL_PLUGINS array)  
**Why:** Assignment requires "all content changes" - must be automatic

### 3. Lifecycle Integration
**Implementation:** `strapi.db.lifecycles.subscribe()`  
**Why:** Captures ALL database operations automatically  
**Alternative considered:** Manual hooks in each content type (too fragile)

### 4. Permission Model
**Implementation:** Single `read` permission in bootstrap  
**Why:** Simple RBAC, appears automatically in UI

### 5. Data Capture Strategy

**What we log:**
- Before/after snapshots (full objects)
- Changed fields list (computed diff)
- Correlation IDs (cuid2 for tracking)

**Why full snapshots:**
- Complete audit trail
- No data loss
- Can reconstruct any state

**Trade-off:** Storage size vs completeness → chose completeness

### 6. Performance Strategy

**Current:** Synchronous logging (await)  
**Why:** Simpler, reliable for testing  
**Future:** Fire-and-forget async (`.catch()` for errors)  
**Impact:** ~10-50ms latency per request (acceptable for audit use case)

### 7. Metadata Collection

**Sources:**
- `ctx.request.ip` → IP address
- `ctx.request.headers['user-agent']` → Browser info
- `ctx.state.user` → User details
- Headers or generated → Correlation ID

**Exclusions:**
- Sensitive data (passwords, tokens) → not logged
- System fields (createdAt, updatedAt) → excluded from diff

### 8. API Design

**Endpoint:** `/admin/audit-logs`  
**Why admin route:** Audit logs are administrative data  
**Filters:** Comprehensive (contentType, userId, action, dateRange)  
**Pagination:** Required (audit logs grow indefinitely)

### 9. Configuration

**Options:**
- `enabled`: Global on/off switch
- `excludeContentTypes`: Blacklist (file uploads, etc.)

**Defaults:** Conservative (exclude upload.file to avoid noise)

### 10. Error Handling

**Strategy:** Fail-safe (never break user operations)  
**Implementation:** All logging wrapped in try-catch  
**Logging:** Errors logged to console, operation continues

## Technical Stack

- **TypeScript:** Type safety, matches Strapi 5
- **cuid2:** Fast, collision-resistant IDs
- **JSON fields:** Flexible payload/metadata storage
- **Strapi Document API:** Future-proof (v5 API)

## Limitations & Future Work

**Current limitations:**
1. Before-state for updates: Best-effort (may miss if deleted mid-request)
2. Synchronous logging: Small latency impact
3. No log retention policy: Database grows indefinitely

**Future enhancements:**
1. Async fire-and-forget logging
2. Configurable retention (auto-delete old logs)
3. Log rotation/archival
4. Admin UI panel for browsing logs
5. Export functionality (CSV, JSON)

## Testing Strategy

1. Unit tests for service methods
2. Integration tests for lifecycle hooks
3. E2E tests for API endpoint
4. RBAC tests for permissions

## Compliance

Supports:
- GDPR audit requirements
- SOC 2 logging requirements
- General compliance audit trails

Does NOT:
- Encrypt at rest (use database encryption)
- Provide immutability guarantees (add blockchain if needed)
