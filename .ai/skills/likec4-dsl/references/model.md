# Model (LikeC4 DSL)

The `model` block defines the logical architecture: elements (systems, containers, components, actors) organized in a hierarchy, with relationships between them. Views project from this model.

**Key rules:**

- Elements MUST have a kind (from specification) and an identifier unique within their parent.
- Relationships cannot exist directly between parent and child — move them outside the parent element.
- `this` and `it` are aliases for the current element inside a nested relationship.
- Cross-file references require the full FQN (e.g. `cloud.backend.api`); short names are file-scoped.
- `extend FQN { }` adds tags, metadata, and links to an existing element without redefining it.

## Syntax

```likec4
model {
  // Elements — top-level elements are global, referenceable by ID anywhere in the project
  IDENTIFIER = KIND                         // no title, no body (title defaults to identifier)
  IDENTIFIER = KIND "title"                 // with title, without body
  KIND IDENTIFIER "title"                   // alternative: kind before identifier

  IDENTIFIER = KIND {
    TAGS                                    // optional, must come first if present
    PROPERTIES                              // optional, must come before nested elements/relationships

    IDENTIFIER = KIND "Child Title" { ... } // nested element (unlimited depth)
    KIND IDENTIFIER "Child Title"           // nested, kind-first syntax

    // Relationships inside element body (current element is implicitly SOURCE)
    SOURCE -> TARGET                        // explicit, both sides named
    -> TARGET "title"                       // implicit source (current element)
    -> TARGET "title" { TAGS; PROPERTIES }
    -[REL_KIND]-> TARGET "title"            // typed relationship
    .REL_KIND -> TARGET "title"             // alternative typed syntax
    SOURCE -> it                            // TARGET = current element (alias)
    this -> TARGET                          // SOURCE = current element (alias)
  }

  // Top-level relationships (outside element body): SOURCE is required
  SOURCE -> TARGET "title"
  SOURCE -> TARGET "title" { TAGS; PROPERTIES }
  SOURCE -[REL_KIND]-> TARGET
  SOURCE .REL_KIND TARGET

  // Extend existing element (by FQN, from any file)
  extend FQN {
    TAGS                                    // additional tags to apply
    PROPERTIES                              // only `metadata` and `link` are allowed
    NESTED_ELEMENTS | RELATIONSHIPS         // additional children or edges
  }

  // Extend existing relationship — anti-ambiguity matcher contract:
  // 1) SOURCE and TARGET always required.
  // 2) Include KIND when typed relationships exist between source+target pair.
  // 3) Include TITLE when multiple relationships share SOURCE/TARGET/KIND.
  // Omitting KIND is WRONG (not merely ambiguous) when a typed relation exists.
  extend SOURCE -> TARGET { TAGS; PROPERTIES }
  extend SOURCE -[REL_KIND]-> TARGET "title" { TAGS; PROPERTIES }
}
```

## Full Example

```likec4
model {
  customer = actor {
    title "Customer"
    summary "Consumes Cloud Services"
    description """
      User with **active** subscription
      ... detailed description
    """
  }

  cloud = system "Cloud" {
    ui = container "Frontend" {
      technology "React"
      style { shape browser }
      metadata { version "1.0.0"; owners ["Name 1", "Name 2"] }
      link https://github.com/likec4/likec4 "Repository"
      link ../relative/adr1.md

      dashboard = app "Dashboard" { icon tech:react }
    }
    backend = container "Backend" {
      api = service "API" {
        #critical
        -[sql]-> db "reads/writes"
      }
      db = database "DB" {
        style { icon tech:postgresql; shape storage }
      }
    }
    ui.dashboard -> backend.api { title "calls"; technology "HTTPS" }
  }

  customer -> cloud.ui.dashboard "browses" {
    metadata { protocol "HTTPS" }
  }
}
```

## Element Properties

| Property        | Values                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------- |
| **title**       | String, single line                                                                      |
| **description** | String, prefer Markdown. If > 150 chars, also add `summary`.                             |
| **summary**     | String, max 150 characters                                                               |
| **technology**  | String, no multi-line                                                                    |
| **style**       | `style { ... }` — see `references/style-tokens-colors.md`                                |
| **icon**        | Shortcut for `style { icon ... }`, takes precedence over the style block                 |
| **metadata**    | `metadata { KEY VALUE }` — key is identifier format; value is string or array of strings |
| **link**        | `link URL "Optional title"` — repeatable; URL can be relative to the document            |
| **navigateTo**  | ID of a dynamic view to navigate to on click                                             |

## Relationship Properties

`title`, `description`, `technology`, `metadata`, `style`, `link`, `navigateTo`

## Extend Patterns

```likec4
// Add metadata and a link to an existing element from another file:
extend cloud.backend.api {
  metadata { team "platform"; criticality "high" }
  link ./adr-002.md "Scaling decision"
}

// Extend an untyped relationship:
extend cloud.ui.dashboard -> cloud.backend.api {
  metadata { sla "99.9%" }
}

// Extend a typed relationship — include KIND to avoid ambiguous match:
extend cloud.ui.dashboard -[http]-> cloud.backend.api "calls" {
  metadata { sla "99.9%" }
}

// Wrong: if a typed relationship exists, this silently targets the wrong relation
// extend cloud.ui.dashboard -> cloud.backend.api "calls" { ... }
```
