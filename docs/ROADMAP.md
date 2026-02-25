# Roadmap

Future enhancements beyond the completed PRD scope for Strapi Community Edition.

## Completed (from original PRD)

All P0 core platform milestones are complete. Key achievements:

- Content Type Builder with dynamic zones and components
- REST and GraphQL APIs auto-generated from schemas
- Role-Based Access Control (RBAC)
- JWT and session authentication
- Multi-provider file upload (local, S3, Cloudinary)
- Multi-provider email (SendGrid, nodemailer, etc.)
- PostgreSQL, MySQL, MariaDB, SQLite support
- Modern Admin Panel with Media Library
- Internationalization (i18n) plugin
- Content Releases for batch publishing
- Data transfer CLI for import/export
- GraphQL and Documentation plugins
- TypeScript support throughout
- Custom field plugins support

---

## M1: v5 Core Architecture — 🔄 In Progress

Major architectural improvements for Strapi v5.

| Feature | Status |
|---------|--------|
| Documents API (structured content) | ✅ Complete |
| Entity Service layer refactoring | ✅ Complete |
| Stricter TypeScript throughout core | 🔄 In progress |
| New admin panel architecture | 🔄 In progress |
| Unified database layer | 🔄 In progress |
| Event Hub improvements | ✅ Complete |
| Blocks editor (new blocks system) | ✅ Complete |

---

## M2: Content Management Enhancements — 🔄 In Progress

Advanced content workflows and management features.

| Feature | Status |
|---------|--------|
| Review Workflows (EE) - core infrastructure | 🔄 In progress |
| Content Scheduling | ✅ Complete |
| Bulk operations in Content Manager | ✅ Complete |
| Advanced filtering and sorting | ✅ Complete |
| Custom table views | ✅ Complete |
| Content version history improvements | ⬜ Not started |
| Inline editing in Content Manager | ⬜ Not started |

---

## M3: Performance & Scale — ⬜ Not Started

Performance optimizations and scaling capabilities.

| Feature | Status |
|---------|--------|
| Query result caching (Redis) | ⬜ Not started |
| Database query optimization | ⬜ Not started |
| Admin panel lazy loading | ⬜ Not started |
| API response compression | ⬜ Not started |
| Connection pooling improvements | ⬜ Not started |
| Large dataset handling | ⬜ Not started |

---

## M4: Developer Experience — ⬜ Not Started

Enhanced tooling and debugging capabilities.

| Feature | Status |
|---------|--------|
| Visual debugger for content lifecycle | ⬜ Not started |
| API mocking for frontend development | ⬜ Not started |
| Improved error messages with context | ⬜ Not started |
| Test fixtures library | ⬜ Not started |
| GraphQL playground enhancements | ⬜ Not started |
| Strapi Studio / AI assistance | ⬜ Not started |

---

## M5: Ecosystem & Integrations — ⬜ Not Started

Official plugins and third-party connections.

| Feature | Status |
|---------|--------|
| Official Algolia search plugin | ⬜ Not started |
| Official Meilisearch plugin | ⬜ Not started |
| Analytics dashboard plugin | ⬜ Not started |
| Headless CMS connectors | ⬜ Not started |
| Slack/Discord webhook integrations | ⬜ Not started |
| Official Stripe payment plugin | ⬜ Not started |

---

## M6: Documentation & Guides — ⬜ Not Started

Improved documentation and developer resources.

| Feature | Status |
|---------|--------|
| Interactive tutorials | ⬜ Not started |
| Video guides for common tasks | ⬜ Not started |
| Best practices guide | ⬜ Not started |
| Migration guides (v4 to v5) | ⬜ Not started |
| Plugin development course | ⬜ Not started |
| Deployment guides for all major clouds | ⬜ Not started |

---

## Milestones Summary

| Milestone | Description | Status |
|-----------|-------------|--------|
| M1 | v5 Core Architecture | 🔄 In Progress |
| M2 | Content Management Enhancements | 🔄 In Progress |
| M3 | Performance & Scale | ⬜ Not Started |
| M4 | Developer Experience | ⬜ Not Started |
| M5 | Ecosystem & Integrations | ⬜ Not Started |
| M6 | Documentation & Guides | ⬜ Not Started |

---

## Ideas (Unprioritized)

These are potential directions. None have user stories or acceptance criteria yet.

- **AI-powered content assistance**: Auto-generate descriptions, translations
- **Real-time subscriptions**: WebSocket support for live updates
- **Multi-tenant support**: Single Strapi instance for multiple organizations
- **Headless preview**: Draft content preview URLs for headless frontends
- **Scheduled publishing**: Cron-based content publishing/unpublishing
- **Custom GraphQL resolvers**: User-defined GraphQL resolvers
- **API versioning**: Built-in API version management
- **Audit logging**: Track all admin actions

---

## Won't Have (Community Edition)

| Feature | Reason |
|---------|--------|
| Enterprise SSO | Enterprise Edition only |
| Review Workflows (full) | Enterprise Edition only |
| Audit Logs (full) | Enterprise Edition only |
| SSO/SAML | Enterprise Edition only |
| Audit webhooks | Enterprise Edition only |
| Custom roles hierarchy | Enterprise Edition only |
| SSO directory sync | Enterprise Edition only |
| Official mobile SDK | Use REST/GraphQL directly |
| Built-in CDN | Partner with cloud providers |
| Hosted Strapi cloud features | Available separately |

---

## Version History

| Version | Release Date | Key Changes |
|---------|--------------|-------------|
| v4.x | 2022-11 | Stable release, plugin ecosystem |
| v5.x (upcoming) | TBD | Documents API, new architecture |
