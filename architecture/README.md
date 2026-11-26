# Strapi architecture guide

This LikeC4 workspace explains a typical application built with Strapi to a mixed product and
engineering audience. Start with the six curated entry views on the landing page. Each diagram
answers one question; select an element or relationship to explore further.

## Reading paths

| Start with                                                  | Question                                                | Continue to                                |
| ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| `index` — Strapi in context                                 | Who uses the CMS, and what connects to it?              | Runtime architecture                       |
| `strapi_capabilities` — Product capabilities                | What can teams accomplish?                              | A capability's journey or engineering view |
| `strapi_containers` — Runtime architecture                  | What runs, and how does it communicate?                 | Admin, server, or deployment               |
| `content_publishing_flow` — Draft to published content      | How does an editor make content available?              | Content API request journey                |
| `strapi_extensions` — Extension mechanisms                  | How can developers extend the application?              | Choose a mechanism, then its detail        |
| `application_state` — Application code and persistent state | What is deployed, built, and retained across redeploys? | Assembly, startup, hosting and operations  |

The view browser groups diagrams into **01 Start here**, **02 Journeys**, **03 Engineering**,
**04 Deployment**, and **05 Code reference**. The landing page is intentionally smaller than the
complete view catalog. Implicit views are disabled: every navigation destination is authored.
Existing view IDs are retained where practical so saved URLs continue to work.

The numbers order reading categories; they are not C4 abstraction levels or required steps.
Choose a category according to the question you want to answer:

| Category              | Purpose                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| **01 Start here**     | Establish context, capabilities, vocabulary and interface choices.               |
| **02 Journeys**       | Explain user tasks and representative interactions, including their assumptions. |
| **03 Engineering**    | Explain runtime responsibilities, application assembly and extension mechanisms. |
| **04 Deployment**     | Explain application state, hosting examples and operating responsibilities.      |
| **05 Code reference** | Connect selected responsibilities to implementation files.                       |

These categories mix appropriate diagram types: for example, Journeys includes both task maps and
dynamic sequences. Each view's description states its type. Titles use `/` to organize the view
browser; stable view IDs identify navigation destinations independently of their display titles.
The six landing entries serve different reader questions. Add deeper coverage beneath an existing
entry where possible, rather than expanding the landing page for every new topic.

The sixth entry starts with application code and persistent state because those boundaries explain
what a team must deploy and retain across hosting choices. The PostgreSQL/S3 hosting topology is a
deeper example, reached through the database card in that view. It illustrates one infrastructure
choice rather than defining the application. The landing selection lives in `likec4.config.json`;
changing it does not remove a view or change its URL.

**05 Code reference** contains contributor source maps, not exhaustive C4 class diagrams or generated
call graphs. A card can group several files, and several responsibilities can share one file. Open
the card’s implementation links to inspect the code; follow diagram links for related architecture
or journeys. Curated arrows describe the dependency or wrapping relationship written on the label.

The entry views lead to these focused explanations without adding more landing-page entries:

| Topic                                         | View                     | Next step                                                  |
| --------------------------------------------- | ------------------------ | ---------------------------------------------------------- |
| Documents, variants, components and relations | `content_model`          | Schema editing or Document Service                         |
| Identities and token boundaries               | `access_boundaries`      | `admin_login_flow` or a Content API request                |
| Editorial publishing and localization         | `editorial_publishing`   | Basic publishing or content concepts                       |
| Editing, media, preview and history           | `content_workspace`      | Choose a task below                                        |
| Media bytes versus database metadata          | `media_upload_flow`      | Application state and deployment                           |
| Configured frontend preview                   | `content_preview_flow`   | Content workspace                                          |
| Licensed Content History                      | `content_history`        | Content workspace                                          |
| A concrete production hosting topology        | `self_hosted_deployment` | Open the database in Application code and persistent state |

## Deeper reading

The landing page stays small. **Diagram navigation controls** open the subject named on the card.
**Related** and **Guide** links in the view details/links menu beside the title open other topics
explicitly; they do not imply that the destination is inside the selected component. LikeC4 opens
these links in a new tab. Look for the small chain-link icon and link count beside the title;
this menu is less discoverable than a card, so document important routes here.
The two choice maps use a distinct **Guide topic** notation: their cards
and “explore” arrows describe reading choices, not runtime components or dependencies.

| Topic                                       | View                                                 | Entry point in the guide                                                    |
| ------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Interface choices                           | `interface_overview`                                 | Runtime architecture → Related: compare application interfaces              |
| REST and optional GraphQL                   | `content_api_runtime_components`, `graphql_delivery` | Application interfaces → named Content API                                  |
| MCP capability access and execution         | `mcp_interface`                                      | Application interfaces → MCP capabilities                                   |
| Import/export and remote data transfer      | `data_transfer`                                      | Application interfaces → Import export and transfer                         |
| Plugin packaging and entrypoints            | `plugin_entrypoints`                                 | Extension mechanisms → Plugin entrypoints                                   |
| Custom routes and document middleware       | `request_customization`                              | Extension mechanisms → Routes and document middleware                       |
| Custom field registration and storage types | `custom_fields`                                      | Extension mechanisms → Custom fields                                        |
| Events and webhook delivery                 | `events_and_jobs`                                    | Extension mechanisms → Providers and webhooks → Webhook delivery            |
| Scheduled application work                  | `scheduled_work`                                     | Extension mechanisms → Related: scheduled application work                  |
| Query, relation and transaction internals   | `database_persistence`                               | Document service → Database abstraction                                     |
| Startup database schema evolution           | `database_schema_evolution`                          | Startup → Schema synchronization                                            |
| Operating responsibilities                  | `production_operations`                              | Application code and persistent state → Related: operating responsibilities |
| Multiple application instances              | `replicated_deployment`                              | Operating responsibilities → Replicas                                       |
| Backup and recovery boundaries              | `backup_and_recovery`                                | Operating responsibilities → Recovery                                       |

GraphQL, MCP and data transfer have different authentication and execution paths. GraphQL uses
Content API authentication; MCP uses Admin tokens and capability/handler checks; remote transfer
uses dedicated push/pull scopes. These are interfaces of an application, not separate hosted Strapi
products. Transfer moves selected data and assets; it does not deploy application code or replace a
complete recovery strategy.

The operations maps explicitly describe responsibilities for the application team to implement.
They do not claim that Strapi supplies a distributed scheduler, durable webhook queue, automatic
backups or a complete high-availability platform. Content Releases has its own publication locking;
that is distinct from coordinating arbitrary scheduled application work. The two-instance topology
is illustrative and retains the PostgreSQL/S3 choices of the single-process example.

## What the model means

The C4 system is a **typical application built with Strapi**, not a centrally operated SaaS.
Its browser Admin, Node.js server, and application database are distinct runtime containers.
The Admin still executes in the browser when its bundle is served by the same server.

Keep three perspectives distinct:

- **Product capabilities:** what teams can do. These are explicitly labelled capability maps,
  not C4 container diagrams. Arrows describe support or progression, not function calls.
- **Runtime architecture:** applications, stores, and responsibilities executing inside them.
  A plugin or npm package is not automatically a container.
- **Construction and extension:** CLI tooling, application files, plugin exports, and Admin builds.
  These supplementary views explain how the runtime is assembled. They are not deployment diagrams.

Domain concept maps explain vocabulary and access scopes; their cards are not services or database
tables. A document groups stored entries by identity, with locale and draft/published variants where
enabled. Content History snapshots are a separate feature from those publication variants.

Availability is part of the model. In this checkout, i18n is bundled but localization is configured per
content type and field. Users & Permissions requires its plugin. Review Workflows, Content Releases,
Content History and SSO depend on their license features as well as relevant configuration. Preview
uses an application-defined frontend URL handler. A diagram showing these capabilities does not mean
that every application enables them, or that every publishing action goes through a release.

The deployment example chooses **HTTPS ingress, one Strapi process, a separate PostgreSQL service,
and Amazon S3 media storage**. The upload provider runs inside Strapi; file bytes and database-backed
media metadata persist independently of application replacement. This illustrates production hosting
boundaries, not a complete operations design or a mandatory hosting stack. Backups, restore,
monitoring, network policies and high availability are outside this view; the operating-responsibility
and recovery maps explain the additional decisions. The application-state map
uses the same remote-storage example to distinguish source, build output, runtime configuration,
database records and uploaded files. Local uploads are an alternative: their directory needs
persistent storage instead of an object-storage bucket.

Read Production hosting example and Application code and persistent state together: the hosting
view answers **where things run**; the state map answers **what is replaced or retained**.
Retaining the database does not freeze its schema—startup
can synchronize it with deployed content definitions. Private networking and database TLS are
configured assumptions of the example, not automatic Strapi deployment behavior.

See the [Strapi deployment guide](https://docs.strapi.io/cms/deployment) and
[media provider configuration](https://docs.strapi.io/cms/configurations/media-library-providers)
for setup details.

Journeys state their assumptions. Publishing assumes Draft & Publish is enabled. Public content
requests assume Users & Permissions is enabled and the public role allows the action. Schema
editing assumes development with `autoReload`; it includes the restart before the new runtime
loads schemas. API tokens, JWT users, and public-role access are alternative authentication paths.

## Work locally

```bash
cd architecture
yarn install --immutable
yarn dev
```

The server watches all `.c4` and `.likec4` files. From the same directory:

```bash
yarn build
yarn export:png
yarn export:mermaid
yarn format
yarn check
```

`check` checks formatting. Use `likec4 validate` for syntax and model validation:

```bash
yarn exec likec4 validate --json --no-layout .
```

For a focused edit, repeat `--file` for each edited LikeC4 file:

```bash
yarn exec likec4 validate --json --no-layout --file model/strapi.c4 --file views/content-api.c4 .
```

Check both the filtered diagnostics and `totalErrors`. The pinned installation of LikeC4 1.56
can report unexpected filtered-file counts with repeated flags; the unfiltered command above
is the final whole-workspace check. A passing validation does not establish visual readability:
also build and inspect the rendered views, including sequence mode and drill-down navigation.

## Maintaining the guide

The repository includes the LikeC4 DSL skill in [`.ai/skills/likec4-dsl`](../.ai/skills/likec4-dsl/SKILL.md),
originally installed from `likec4.dev`. Run `yarn ai:sync` from the repository root to make it available
through `.agents/skills/`, `.claude/skills/` and `.cursor/skills/`. Commit changes to `.ai/skills/`;
the generated tool links are local-only. Use the skill for DSL syntax and tooling, and this README
for the Strapi-specific modeling decisions and reading paths.

The files form one shared model. `specification.c4` defines the available notation; `model/`
defines reusable elements and relationships; `views/` selects and presents them for particular
questions. A file boundary is an authoring convenience, not a software or deployment boundary.
Model blocks across files are merged, and `extend` adds detail to existing elements. Reuse their
fully qualified IDs instead of creating a second element for another diagram.
The two deployment files are an exception to the directory split: each contains both its
`deployment` topology and its `deployment view`.

- `likec4.config.json` defines the project, landing entries, disabled implicit views and default styles.
- `package.json` defines the local development, build, export and formatting commands.
- `specification.c4` defines the notation and deployment-node kinds.
- `model/navigation.c4` and `views/navigation.c4` define explicit reading choices; the extension
  choice map is in `views/extensions.c4`.
- `model/strapi.c4` contains shared runtime elements and existing code references.
- `model/capabilities.c4` contains the supplementary product vocabulary.
- `model/extensions.c4` contains build artifacts, extension points, providers, and lifecycle roles.
- `model/deployment.c4` defines the illustrative deployment and its storage choice.
- `model/content-concepts.c4` defines the document vocabulary.
- `model/access.c4` separates identity/credential concepts from Admin authentication responsibilities.
- `model/editorial.c4` contains editorial, media, preview and history responsibilities.
- `model/application-state.c4` connects application inputs, build output and persistent state.
- `model/interfaces.c4` and `views/interfaces.c4` cover GraphQL, MCP and data transfer.
- `model/execution.c4` and `views/execution.c4` cover events, jobs and customization.
- `model/persistence.c4` and `views/persistence.c4` cover database internals and schema evolution.
- `model/operations.c4`, `views/operations.c4` and `model/replicated-deployment.c4` cover operating
  responsibilities, recovery boundaries and an illustrative two-instance deployment.
- `views/overview.c4` contains the introductory views and the server overview.
- Other `views/` files contain focused engineering views and journeys.

### Contributor and agent workflow

1. Read this guide, the project configuration, and the relevant existing model/view files.
   Inspect the current implementation before adding a behavioral claim; source links are pointers
   to evidence, not a substitute for reading it. This is a curated explanation, not an exhaustive
   package inventory or an automatically generated call graph.
2. State the audience, question, scope, diagram type and assumptions. Choose a reading category,
   then reuse existing elements or extend the relevant model file. Separate implemented behavior
   from illustrative infrastructure and operating procedures the application team must supply.
3. Author a focused view and provide a meaningful route from an existing entry. Use card navigation
   for the named subject, relationship navigation for a dynamic journey, and labelled Related/Guide
   links for alternatives. Preserve existing IDs and update the reading paths above.
4. Run formatting, whole-workspace validation and the build using the commands above. Inspect
   `totalErrors`; formatting or a successful build alone does not establish model validity.
5. Inspect the rendered diagram at a normal browser size, including sequence mode for journeys.
   Click changed navigation routes. Audit reachability from `landingPage.include` through node/edge
   `navigateTo` targets and internal view links, and check that implementation links resolve.
   Shared model changes can affect other views, so inspect their resulting nodes and relationships too.

Treat code in the current checkout as the evidence for implementation claims. GitHub links follow
the moving `develop` branch and may differ from this checkout; reconcile discrepancies when updating
the guide. Recheck version-specific LikeC4 workarounds when upgrading the dependency.

Before adding a diagram, state its audience, question, scope, and assumptions. Prefer a small
view of existing model elements over copying them or growing a global map. Use roughly 5–9 main
elements for introductory diagrams; this is a readability target, not a C4 rule. Code-reference
views may contain more detail because readers opt into them.

Use a short `summary` on each card and a fuller `description` in its details. Keep `technology`
concise (for example, Node.js / Koa); put repository paths in implementation metadata and clickable
links. Code links follow `develop`, so check them when the implementation moves.

Element includes also bring in relationships. For curated diagrams, use `exclude * -> *` after
the element selection, then include the intended relationships with explicit labels. Inspect the
rendered result for merged `[...]` labels, unwanted inferred edges, and excessive crossings.
Use `with { navigateTo view_id }` on view elements for detail about the named subject. Navigation
from a relationship leads to a relevant dynamic journey. Use labelled view-level `link` entries for
related topics and alternatives; sibling URLs such as `../interface_overview/` also work when the
guide is hosted under a URL prefix. Include these links when auditing guide reachability.
Do not use a credential, configuration input or narrow example as an unrelated navigation shortcut.
In the installed LikeC4 version, element-level `navigateTo` in the model is not supported.

Do not mix an element and its descendants as participants in the same sequence. Keep build-time,
startup, request-time and development reload behaviour in separate views. A relationship from an
Admin extension to a server plugin means an HTTP request; sharing a plugin package does not itself
create a runtime network relationship.

Review each change for:

- correct person/system/container/component distinctions;
- a stated meaning for shapes, colours and arrows (use the diagram notation key);
- readable labels at the intended viewport size;
- a useful destination for each intentional drill-down;
- accurate optional-plugin, Draft & Publish and environment assumptions;
- implementation evidence for new architectural claims;
- zero model errors, a successful build, and no sequence-layout warnings.

## References

- [C4 abstraction levels](https://c4model.com/abstractions)
- [C4 diagram review checklist](https://c4model.com/diagrams/checklist)
- [LikeC4 summaries and descriptions](https://likec4.dev/dsl/model/)
- [LikeC4 view organization](https://likec4.dev/dsl/views/organize/)
