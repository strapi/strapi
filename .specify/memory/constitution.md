# Strapi Feature Development Constitution

## Core Principles

### I. User Story Driven
Every feature MUST be traceable to user stories. User stories MUST be independently testable - implementing a single story delivers a viable MVP increment. Stories MUST be prioritized (P1, P2, P3) with P1 being essential.

**Rationale**: Ensures feature development stays focused on user value and enables incremental delivery.

### II. Test-First Development
Tests for new functionality MUST be written before implementation. Tests MUST fail initially (red), then pass after implementation (green), then be refactored. This TDD cycle MUST be followed for all new features.

**Rationale**: Guarantees test coverage, prevents implementation drift, and enables safe refactoring.

### III. Multi-Layer Testing
Features MUST include appropriate test coverage:
- **Unit tests**: Core business logic and utilities
- **Contract tests**: API boundaries and interfaces
- **Integration tests**: Cross-component workflows and database interactions
- **E2E tests**: Critical user journeys in the admin panel

**Rationale**: Each layer catches different categories of bugs. Integration and E2E tests are mandatory for CMS workflows.

### IV. Plugin Architecture
New functionality SHOULD be implemented as plugins when it represents a distinct feature that can be enabled/disabled independently. Plugins MUST be self-contained with their own lifecycle, services, and routes.

**Rationale**: Strapi's plugin system is core to its extensibility. Maintains modularity and allows users to customize their installation.

### V. Backward Compatibility
Breaking changes to public APIs, database schemas, or plugin interfaces MUST be versioned as MAJOR changes. Deprecation warnings MUST be emitted at least one minor version before removal.

**Rationale**: Strapi has a large user base. Breaking changes without warning cause significant migration pain.

### VI. Security by Default
All new features MUST:
- Validate all inputs (params, body, headers)
- Use parameterized queries to prevent SQL injection
- Enforce proper authorization checks
- Follow principle of least privilege

**Rationale**: Strapi powers production applications. Security vulnerabilities have high impact.

### VII. Documentation同步
All new features MUST include:
- API documentation (if exposing endpoints)
- Plugin configuration schema (if configurable)
- Migration guide (if schema changes)
- Updated README in package if CLI新增

**Rationale**: Users depend on docs for configuration and troubleshooting.

### VIII. Type Safety
All new TypeScript code MUST have explicit types for function signatures, return values, and public APIs. Avoid `any` unless absolutely necessary (e.g., dynamic plugin schemas).

**Rationale**: Type safety prevents runtime errors and enables better IDE support for plugin developers.

## Quality Standards

### Code Quality
- All code MUST pass linting (ESLint) before merge
- All code MUST follow project's formatting conventions (Prettier)
- Complexity justification REQUIRED in PR for functions exceeding 50 lines or 3 levels of nesting

### Database Migrations
- Migrations MUST be reversible (up/down) or include clear rollback instructions
- Migration files MUST NOT contain business logic
- Data migration scripts MUST handle partial failures gracefully

### Performance
- Database queries MUST use appropriate indexes for frequently filtered fields
- N+1 query patterns MUST be avoided in list endpoints
- Large datasets MUST use pagination (cursor or offset-based)

## Development Workflow

### Feature Lifecycle
1. **Specification**: User stories defined with acceptance criteria
2. **Plan**: Technical approach documented with complexity analysis
3. **Implementation**: Following task phases from tasks.md
4. **Testing**: All test layers passing
5. **Review**: Code review + security review for sensitive areas
6. **Documentation**: Docs updated before merge

### Pull Request Requirements
- All CI checks MUST pass
- Code coverage MUST NOT decrease (unless justified)
- At least one approver required
- Link to related issue/PR

## Governance

### Amendment Procedure
1. Propose change via PR to constitution.md
2. Document rationale and impact on existing workflows
3. Require approval from 2 maintainers
4. Update version following semantic versioning rules:
   - MAJOR: Remove or fundamentally change existing principles
   - MINOR: Add new principles or expand guidance materially
   - PATCH: Clarifications, wording, typos, non-semantic refinements

### Compliance Verification
- Plan template Constitution Check gate MUST be verified before Phase 0 research
- Constitution compliance MUST be rechecked after Phase 1 design
- Any principle violations MUST be documented in Complexity Tracking table

### References
- Use `.specify/templates/spec-template.md` for feature specifications
- Use `.specify/templates/plan-template.md` for implementation planning
- Use `.specify/templates/tasks-template.md` for task organization

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
