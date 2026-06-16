# Strapi as a Primitive — Design Set

This folder is the structured design package for **Strapi as a Primitive**, derived
from the narrative RFC at [`../strapi-as-a-primitive.md`](../strapi-as-a-primitive.md).

The RFC remains the prose source of truth (motivation, discussion, trade-offs). The
files here re-express that design using the [C4 model](https://c4model.com/) plus
Architecture Decision Records (ADRs) and an implementation checklist, so the plan is
navigable top-down and each significant decision is individually traceable.

## What is "Strapi as a Primitive"?

Make Strapi usable as a **library you import and wire up** (`defineApp` + `startStrapi`)
in addition to the existing scaffolded-app + CLI experience — with **zero breaking
changes** to legacy apps. See the RFC summary for the canonical example.

## Map of this folder

| Document                                               | C4 level / purpose                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [`c4/01-system-context.md`](./c4/01-system-context.md) | **L1 — System Context.** Who uses Strapi-as-a-primitive and the systems it touches.               |
| [`c4/02-containers.md`](./c4/02-containers.md)         | **L2 — Containers.** Packages/exports and how a programmatic app runs.                            |
| [`c4/03-components.md`](./c4/03-components.md)         | **L3 — Components.** The `app-definition` module + refactored loaders inside `@strapi/core`.      |
| [`c4/04-code.md`](./c4/04-code.md)                     | **L4 — Code.** Key types, signatures, brands, and integration seams.                              |
| [`decisions/`](./decisions/README.md)                  | **ADRs + decision log.** One record per architecturally significant choice; a table for the rest. |
| [`tasks.md`](./tasks.md)                               | **Implementation checklist.** Ordered, dependency-aware task list for Phase 1.                    |

## Reading order

1. RFC summary + "The two modes" (context and the central decision).
2. C4 L1 → L4 (zoom from system to code).
3. ADRs (why each major thing is the way it is).
4. `tasks.md` (what to build, in order).

## Status

- **Phase 1 (headless MVP):** designed, not implemented.
- **Phase 2 (admin):** outlined.
- **Phase 3 (ecosystem/DX):** outlined.

> "Headless" means no admin **panel** is built or served; the `@strapi/admin` **server
> module** still loads, because content-type creator relations target `admin::user`
> (see ADR-0007).
