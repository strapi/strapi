# Strapi architecture guide

This LikeC4 workspace explains a typical application built with Strapi to a mixed product and
engineering audience. Start with the six curated entry views on the landing page. Each diagram
answers one question; select an element or relationship to explore further.

## Reading paths

| Start with                                             | Question                                             | Continue to                                |
| ------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------ |
| `index` — Strapi in context                            | Who uses the CMS, and what connects to it?           | Runtime architecture                       |
| `strapi_capabilities` — Product capabilities           | What can teams accomplish?                           | A capability's journey or engineering view |
| `strapi_containers` — Runtime architecture             | What runs, and how does it communicate?              | Admin, server, or deployment               |
| `content_publishing_flow` — Draft to published content | How does an editor make content available?           | Content API request journey                |
| `strapi_extensions` — Plugin entrypoints               | How do plugins contribute to the application?        | Assembly, provider and code views          |
| `self_hosted_deployment` — Production hosting example  | What hosts production, and what survives a redeploy? | Runtime architecture                       |

The view browser groups diagrams into **01 Start here**, **02 Journeys**, **03 Engineering**,
**04 Deployment**, and **05 Code reference**. The landing page is intentionally smaller than the
complete view catalog. Implicit views are disabled: every navigation destination is authored.
Existing view IDs are retained where practical so saved URLs continue to work.

The entry views lead to these focused explanations without adding more landing-page entries:

| Topic                                         | View                   | Next step                                                   |
| --------------------------------------------- | ---------------------- | ----------------------------------------------------------- |
| Documents, variants, components and relations | `content_model`        | Schema editing or Document Service                          |
| Identities and token boundaries               | `access_boundaries`    | `admin_login_flow` or a Content API request                 |
| Editorial publishing and localization         | `editorial_publishing` | Basic publishing or content concepts                        |
| Editing, media, preview and history           | `content_workspace`    | Choose a task below                                         |
| Media bytes versus database metadata          | `media_upload_flow`    | Application state and deployment                            |
| Configured frontend preview                   | `content_preview_flow` | Content workspace                                           |
| Licensed Content History                      | `content_history`      | Content workspace                                           |
| Application code versus persistent state      | `application_state`    | Open the database in Runtime architecture to reach this map |

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
monitoring, network policies and high availability are outside this view. The application-state map
uses the same remote-storage example to distinguish source, build output, runtime configuration,
database records and uploaded files. Local uploads are an alternative: their directory needs
persistent storage instead of an object-storage bucket.

Read the two deployment views together: the hosting view answers **where things run**; the state map
answers **what is replaced or retained**. Retaining the database does not freeze its schema—startup
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

- `specification.c4` defines the notation and deployment-node kinds.
- `model/strapi.c4` contains shared runtime elements and existing code references.
- `model/capabilities.c4` contains the supplementary product vocabulary.
- `model/extensions.c4` contains build artifacts, extension points, providers, and lifecycle roles.
- `model/deployment.c4` defines the illustrative deployment and its storage choice.
- `model/content-concepts.c4` defines the document vocabulary.
- `model/access.c4` separates identity/credential concepts from Admin authentication responsibilities.
- `model/editorial.c4` contains editorial, media, preview and history responsibilities.
- `model/application-state.c4` connects application inputs, build output and persistent state.
- `views/overview.c4` contains the introductory views and the server overview.
- Other `views/` files contain focused engineering views and journeys.

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
Use `with { navigateTo view_id }` on view elements and relationships to choose useful destinations.
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
