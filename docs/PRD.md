# PRD: Strapi Community Edition

The leading open-source headless CMS, 100% JavaScript/TypeScript, flexible and fully customizable. Strapi enables developers to build APIs quickly while giving editors a modern admin panel.

## Implementation Status

Core platform complete. v5 architecture in progress. See [ROADMAP.md](ROADMAP.md) for details.

---

## User Stories

### P0: Core Platform (Must Have) — ✅ Complete

**As a** developer,
**I want** to create a content API quickly,
**So that** I can focus on building my front-end application.

- [P0-US1] ✅ Content Type Builder — define schemas via UI or code
- [P0-US2] ✅ REST API with full CRUD operations
- [P0-US3] ✅ GraphQL API with auto-generated queries/mutations
- [P0-US4] ✅ Role-Based Access Control (RBAC) for content
- [P0-US5] ✅ Authentication (JWT, sessions)
- [P0-US6] ✅ File upload with multiple provider support (local, S3, Cloudinary)
- [P0-US7] ✅ Email plugin with multiple providers (SendGrid, nodemailer, etc.)
- [P0-US8] ✅ Database abstraction (PostgreSQL, MySQL, MariaDB, SQLite)
- [P0-US9] ✅ Dynamic Zone support for flexible content structures
- [P0-US10] ✅ Component system for reusable content blocks

**Acceptance Criteria:**
- Create a content type and expose API in under 5 minutes
- All CRUD endpoints auto-generated from schema
- Works with PostgreSQL, MySQL, SQLite out of the box

---

### P0: Admin Panel (Must Have) — ✅ Complete

**As a** content editor,
**I want** a modern, intuitive admin interface,
**So that** I can manage content without technical knowledge.

- [P0-US11] ✅ Content Manager — list, create, edit, delete entries
- [P0-US12] ✅ Media Library for asset management
- [P0-US13] ✅ Internationalization (i18n) for multi-language content
- [P0-US14] ✅ Content version history (basic)
- [P0-US15] ✅ Collection and Single Type distinction
- [P0-US16] ✅ Custom field plugins support

**Acceptance Criteria:**
- Responsive design works on desktop and tablet
- Media library supports drag-and-drop uploads
- i18n enables per-locale content editing

---

### P0: Developer Experience (Must Have) — ✅ Complete

**As a** developer,
**I want** powerful CLI and configuration tools,
**So that** I can scaffold projects and customize behavior.

- [P0-US17] ✅ `create-strapi-app` for project scaffolding
- [P0-US18] ✅ `strapi generate` commands for APIs, controllers, services
- [P0-US19] ✅ Plugin development support
- [P0-US20] ✅ TypeScript support with autocompletion
- [P0-US21] ✅ Webhooks for event-driven integrations
- [P0-US22] ✅ Custom API routes and controllers

**Acceptance Criteria:**
- New project ready in under 2 minutes
- TypeScript types generated from schemas
- Plugins can extend core functionality

---

### P1: Content Management (Should Have) — ✅ Complete / 🔄 In Progress

**As a** content manager,
**I want** advanced content workflows,
**So that** I can manage complex publishing processes.

- [P0-US23] ✅ Content Releases — bundle changes for batch publishing
- [P0-US24] ✅ Draft & Publish system for editorial workflows
- [P1-US1] 🔄 Review Workflows — multi-step approval (EE feature, core started)
- [P1-US2] ✅ Editorial workflows via Draft & Publish
- [P1-US3] ✅ Bulk operations in Content Manager
- [P1-US4] ✅ Advanced filtering and sorting
- [P1-US5] ✅ Custom table views in Content Manager

**Acceptance Criteria:**
- Draft & Publish enables clear draft/published states
- Content Releases allow grouping multiple entries
- Filters support complex queries (relations, deep filtering)

---

### P1: Data Operations (Should Have) — ✅ Complete

**As an** operator,
**I want** robust data import/export,
**So that** I can migrate content and backup my data.

- [P1-US6] ✅ Data transfer CLI for import/export
- [P1-US7] ✅ Transfer remote Strapi instances
- [P1-US8] ✅ Backup to local files
- [P1-US9] ✅ Restore from backup
- [P1-US10] ✅ Exclude specific content types from transfer

**Acceptance Criteria:**
- Transfer 10K+ entries without memory issues
- Progress indicators for long operations
- Integrity verification after transfer

---

### P1: Extensibility (Should Have) — ✅ Complete

**As a** developer,
**I want** rich ecosystem extensions,
**So that** I can add functionality without rebuilding.

- [P1-US11] ✅ GraphQL plugin with advanced features (pagination, filters)
- [P1-US12] ✅ Documentation plugin (OpenAPI auto-generation)
- [P1-US13] ✅ Users & Permissions plugin (full auth system)
- [P1-US14] ✅ i18n plugin (core localization)
- [P1-US15] ✅ Sentry plugin for error tracking

**Acceptance Criteria:**
- GraphQL schema auto-generated from content types
- Documentation auto-generated and accessible
- Users can have custom roles and permissions

---

### P1: v5 Architecture (Should Have) — 🔄 In Progress

**As a** developer,
**I want** improved architecture for v5,
**So that** the platform is more maintainable and performant.

- [P1-US16] ✅ Documents API — structured content with versioning
- [P1-US17] ✅ Entity Service layer refactoring
- [P1-US18] ✅ Stricter typing throughout core
- [P1-US19] 🔄 New admin panel architecture
- [P1-US20] ⬜ Unified database layer across adapters

**Acceptance Criteria:**
- Documents API provides consistent multi-locale handling
- TypeScript strict mode enabled
- Better performance for complex queries

---

### P2: Performance & Scale (Could Have) — ⬜ Not Started

**As an** operator,
**I want** better performance at scale,
**So that** my application handles high traffic.

- [P2-US1] ⬜ Query caching layer (Redis integration)
- [P2-US2] ⬜ Horizontal scaling documentation
- [P2-US3] ⬜ Load balancing configuration guides
- [P2-US4] ⬜ Database connection pooling best practices
- [P2-US5] ⬜ Performance benchmarks and profiling tools

**Acceptance Criteria:**
- Documentation for Redis caching integration
- Benchmarks for common CRUD operations
- Auto-scaling guides for major cloud providers

---

### P2: Developer Experience (Could Have) — ⬜ Not Started

**As a** developer,
**I want** enhanced debugging and testing tools,
**So that** I can build faster with confidence.

- [P2-US6] ⬜ Visual debugger for content lifecycle
- [P2-US7] ⬜ API mocking for frontend development
- [P2-US8] ⬜ Better error messages with context
- [P2-US9] ⬜ Test fixtures and factories library
- [P2-US10] ⬜ Playground for GraphQL mutations

**Acceptance Criteria:**
- Visual debugger shows event flow
- Fixtures simplify test setup
- Playground enables GraphQL experimentation

---

### P3: Ecosystem (Nice to Have) — ⬜ Not Started

**As a** developer,
**I want** more official plugins and integrations,
**So that** I don't have to build common features.

- [P3-US1] ⬜ Official search plugin (Algolia/Meilisearch)
- [P3-US2] ⬜ Official analytics plugin
- [P3-US3] ⬜ Official email marketing integrations (Mailchimp, ConvertKit)
- [P3-US4] ⬜ Official CMS connectors (Headless WordPress, Contentful)
- [P3-US5] ⬜ Official Slack/Discord integrations

---

## Non-Functional Requirements

### Performance
- API response time < 200ms for simple CRUD (p95)
- Admin panel load time < 3s on 3G
- Support 100+ content types without degradation
- Database queries optimized with proper indexing

### Security
- OWASP Top 10 compliance
- Input validation on all endpoints
- CSRF protection
- XSS prevention
- SQL injection prevention (parameterized queries)
- JWT with configurable expiry

### Scalability
- Horizontal scaling capable
- Stateless API design
- Database connection pooling
- Media storage abstraction

### Compatibility
- Node.js 18+ (LTS)
- npm 10+ / yarn 1.22+
- PostgreSQL 12+ / MySQL 8+ / MariaDB 10.5+ / SQLite 3+
- TypeScript 5.x

---

## Test Scenarios

1. **Create Content Type**: Create via Admin UI, verify API auto-generated
2. **CRUD Operations**: POST, GET, PUT, DELETE on custom content type
3. **GraphQL**: Create query and mutation, verify response
4. **Authentication**: Register user, login, access protected route
5. **RBAC**: Create custom role, verify permissions enforced
6. **Media Upload**: Upload image via Admin, verify served correctly
7. **i18n**: Create localized content, verify locale filtering
8. **Data Transfer**: Export content, import to new instance
9. **Plugins**: Install GraphQL plugin, verify schema updated
10. **Webhooks**: Configure webhook, trigger event, verify POST received
