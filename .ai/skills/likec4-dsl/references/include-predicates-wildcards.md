# Include Predicates and Wildcards in Views

## Wildcard semantics

LikeC4 uses three wildcard forms in view predicates: `*`, `_`, and `**`.

### `*` — immediate children and direct contains-relationships

```likec4
views {
  view container-overview {
    include *
  }
}
```

- Includes **direct children** of the scoped element (one level down).
- Includes **direct relationships** defined at the same scope.
- Does **not** include grandchildren or descendant chains.

### `_` — anonymous matcher (matches any element)

```likec4
views {
  view with-predicates {
    include * where kind is service
    exclude _ where tag is #deprecated
  }
}
```

- `_` matches any element in the model.
- Used in conjunction with `where` predicates to match by kind, tag, or metadata.
- Example: `exclude _ where tag is #deprecated` — exclude any element tagged deprecated.

### `**` — recursive descent (all descendants)

```likec4
views {
  view full-tree {
    include **
  }
}
```

- Includes **all descendants** recursively (grandchildren, great-grandchildren, etc.).
- **Not** the same as `include *` (which is immediate children only).
- Use when you want nested hierarchies visible in a single view.

## Scoped view base semantics

In a **scoped view** (`view name of parent { ... }`), the `include` base set has special meaning:

```likec4
views {
  view backend-overview of cloud.backend {
    include *                  // Base set: cloud.backend + its immediate children
    include -> cloud.backend   // Add: inbound relationships to the scope
    include -> *               // Add: outbound relationships from children
  }
}
```

**Key facts:**

- `include *` in a scoped view = the scoped parent + **direct children only**
- Grandchildren inside `*` context are **not** included (you'd need `include **` or explicit FQN inclusion)
- Relationship predicates like `->` and `<->` can further expand what neighbors appear

## Common filter patterns

### Show a container and its components

```likec4
views {
  view container-details of cloud.backend.api {
    include *              // api (parent) + all components
    include -> api         // Add external callers
  }
}
```

### Show descendants recursively

```likec4
views {
  view system-tree of cloud {
    include **             // All descendants of cloud (full tree)
  }
}
```

### Filter by kind

```likec4
views {
  view services-only {
    include * where kind is service
    include ** where kind is service  // All services at any depth
  }
}
```

### Filter by tag

```likec4
views {
  view critical-view {
    include * where tag is #critical
    exclude _ where tag is #deprecated
  }
}
```

## Relationship predicate expansion

In scoped views, you can expand what neighboring elements appear via relationship predicates:

```likec4
views {
  view backend-with-neighbors of cloud.backend {
    include *                // Base: backend scope + direct children
    include -> cloud.backend // Add: inbound edges from outside scope
  }
}
```

This **does not change the base set of elements**; it only **includes relationships** that end in the visible elements. Neighbors of the scope that have incoming edges _do_ appear because they are needed to render those edges visually.

## Wildcard `**` vs. explicit include

### Using `**` (recursive)

```likec4
views {
  view all-elements {
    include **
  }
}
```

- Automatically includes all descendants.
- Used when hierarchy depth is unknown or variable.

### Using `*` + explicit FQNs

```likec4
views {
  view two-levels {
    include *              // Level 1
    include cloud.*        // Level 2 under cloud
  }
}
```

- More explicit; requires knowing the hierarchy.
- Useful when you want fine-grained control.

## Common mistakes

| Wrong                                                 | Right                             | Why                                                          |
| ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `include **` expecting only immediate children        | `include *`                       | `**` is recursive; use `*` for one level                     |
| Forgetting to add relationship filters in scoped view | `include *` + `include -> parent` | Relationships may not auto-render without explicit inclusion |
| Assuming `include *` includes grandchildren           | Use `include **` instead          | `*` is immediate children only                               |

## Summary table

| Form                  | Matches                                 | Scope context                  |
| --------------------- | --------------------------------------- | ------------------------------ |
| `*`                   | Direct children + sibling relationships | One level down                 |
| `_`                   | Any element (used with `where` filters) | Matches by kind, tag, metadata |
| `**`                  | All descendants recursively             | Any depth                      |
| `include -> element`  | Inbound relationships to element        | Shows external sources         |
| `include element ->`  | Outbound relationships from element     | Shows targets                  |
| `include <-> element` | Bidirectional relationships             | Shows symmetric dependencies   |

**In scoped views:** `include *` establishes a base set of the scope parent + immediate children. Relationship predicates like `->` and `<->` can bring in neighboring elements needed to render those relationships.
