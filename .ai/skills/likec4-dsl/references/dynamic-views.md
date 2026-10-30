# Dynamic Views — Flow & Sequence Diagrams

Dynamic views model temporal interactions and flows between elements. They render as animated flow diagrams or (optionally) UML sequence diagrams.

## Syntax Overview

```likec4
views {
  dynamic view name {
    variant sequence  // optional: render as UML sequence diagram

    title "Flow title"
    description "Flow description"

    SOURCE -> TARGET "step title"
    SOURCE <- TARGET "return flow"

    // grouped parallel actions
    parallel {
      SOURCE_1 -> TARGET_1 "parallel action 1"
      SOURCE_2 -> TARGET_2 "parallel action 2"
    }
  }
}
```

## Basic Steps

### Forward step

```likec4
dynamic view checkout-flow {
  customer -> frontend "opens cart"
  frontend -> backend "requests checkout"
  backend -> payment-service "initiates payment"
  payment-service -> bank "authorizes card"
}
```

- Renders as directed arrow from source to target.
- Title appears on the arrow/step.

### Return step (response arrow)

```likec4
dynamic view checkout-flow {
  customer -> frontend "opens cart"
  frontend -> backend "requests checkout"
  backend <- payment-service "payment result"  // Return flow
}
```

- `<-` denotes response/return flow.
- Renders as dotted or dashed arrow depending on theme.
- Semantically indicates flow **back** to the source.

### Chained steps

```likec4
dynamic view multi-hop {
  customer -> frontend "request"
    -> backend "forwards"
    -> db "query"
}
```

Keep the chain as one compound expression when the prompt explicitly asks for chained syntax.

### Hop-local body (exactness for evals)

```likec4
dynamic view checkout-flow {
  customer -> frontend
    -> api {
      technology 'HTTPS'
      navigateTo payment-detail
    }
}
```

Attach the body only to the requested hop. Do not move the block onto the whole chain unless the prompt allows it.

## Parallel Blocks

Group simultaneous/independent actions in one `parallel { ... }` block:

```likec4
dynamic view fan-out {
  backend -> cache "write to cache"
  parallel {
    backend -> db "save record"
    backend -> audit-log "log event"
    backend -> notification-service "send notification"
  }
}
```

- All actions inside `parallel { ... }` are considered concurrent.
- Renders with time-aligned horizontal layout.
- Use for fan-outs: one source to multiple targets.
- Do **not** nest `parallel` blocks; flatten all concurrent actions.

## Step Properties (Body)

Attach a body block `{ ... }` to a step for additional metadata:

```likec4
dynamic view with-notes {
  customer -> frontend "view product" {
    title "View Product Detail"
    technology "HTTPS"
    description "Customer opens product page"
  }

  frontend -> backend "fetch product data" {
    notes """
      Includes:
      - Product info
      - Pricing
      - Available inventory
    """
  }

  backend -> db "query" {
    metadata {
      latency "50ms"
      cached false
    }
  }
}
```

**Available properties inside step body:**

- `title` — alternative or longer title
- `technology` — technology/protocol used
- `description` — detailed description
- `notes` — markdown-formatted notes/commentary
- `metadata` — key-value pairs for custom data

## Navigation & Drill-down

Link to another view from a step:

```likec4
dynamic view high-level {
  customer -> frontend "browse"
  frontend -> backend "request data" {
    navigateTo data-fetch-details  // Link to another view
  }
}

dynamic view data-fetch-details {
  // Detailed flow of the "data-fetch" step
}
```

- `navigateTo <view-name>` — renders as a clickable link to drill down.
- Use for progressive disclosure: high-level flows → detailed sub-flows.

## Variant: Sequence Diagram

Render the dynamic view as a UML-style sequence diagram:

```likec4
dynamic view checkout-sequence {
  variant sequence  // Switch to sequence diagram rendering

  customer -> frontend "click checkout"
  frontend -> backend "POST /checkout"
  backend -> payment-service "charge card"
  payment-service <- bank "authorization"
  backend <- payment-service "charge approved"
  frontend <- backend "200 OK"
  customer <- frontend "show confirmation"
}
```

- `variant sequence` — tells LikeC4 to render as sequence diagram.
- Timeline flows top-to-bottom (instead of left-to-right flow diagram).
- Actors (lifelines) are participants; return arrows are dashed.

### Comparing flow vs. sequence rendering

| Aspect        | Flow Diagram                   | Sequence Diagram (variant sequence) |
| ------------- | ------------------------------ | ----------------------------------- |
| Layout        | Left-to-right or top-down flow | Top-to-bottom lifelines             |
| Return arrows | Style varies                   | Dashed lines standard               |
| Parallel feel | Horizontal alignment           | Time-based with spacing             |
| Best for      | System interactions            | Message exchange protocols          |

## Response Arrow Patterns (exactness)

If the prompt asks for response arrows back out, prefer `<-` steps over inventing extra forward steps:

```likec4
dynamic view checkout-flow {
  customer -> frontend -> api
  customer <- frontend <- api  // Prefer chained <- for responses
}
```

NOT:

```likec4
dynamic view checkout-flow {
  customer -> frontend -> api
  api -> frontend "returns"  // Wrong: not a response arrow (missing symmetry)
  frontend -> customer "returns"
}
```

## Common Patterns

### Fan-out with return

```likec4
dynamic view fan-out-return {
  backend -> cache "check"
  backend -> db "if miss"
  backend <- db "result"
  backend -> client "send"
}
```

Order: send to multiple targets, then collect responses separately when they differ.

### Pipeline / staged flow

```likec4
dynamic view data-pipeline {
  source -> ingester "submit"
  ingester -> parser "parse"
  parser -> validator "validate"
  validator -> storage "store"
  validator <- storage "ack"
}
```

- Linear chain: each stage outputs to the next.
- Use for ETL/processing workflows.

### Conditional/branching (narrative)

```likec4
dynamic view payment-decision {
  customer -> frontend "enter amount"
  frontend -> backend "validate" {
    notes "If amount > limit, rejected"
  }

  backend -> payment-service "charge" {
    notes "Only if validation passes"
  }

  backend <- payment-service "result"
  frontend <- backend "response"
}
```

- LikeC4 does **not** render explicit if/then/else branches visually.
- Use `notes` on steps to document decision logic.

## Anti-Patterns to Avoid

| Anti-pattern                                  | Problem                                     | Solution                                            |
| --------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Nested `parallel { parallel { ... } }`        | Syntax error; flatten as required           | Put all concurrent steps in one `parallel {}`       |
| Chaining inside `parallel`                    | Ambiguous timing                            | Move chains to separate sequential steps            |
| Too many steps in one view                    | Diagram becomes unreadable                  | Split into sub-views with `navigateTo`              |
| Using `<-` for side-by-side actions           | Implies return; violates sequence semantics | Use forward `->` or group with `parallel`           |
| Forgetting `variant sequence` when UML needed | Wrong rendering                             | Add `variant sequence` if sequence diagram required |

## Predicate Filters in Dynamic Views

Dynamic views do **not** directly support predicate filtering like element views do. Instead:

1. **Explicitly list steps** — name each source and target.
2. **Use tags/metadata for filtering decisions** — in notes or documentation.
3. **Create separate flows** for different subsets of elements.

```likec4
dynamic view critical-flow {
  // Only include critical services (documented in spec)
  frontend -> api "request"
  api -> db "query"
}

dynamic view with-cache {
  // Alternative flow with cache layer
  frontend -> cache "check"
  cache -> backend "if miss"
}
```

## Reference and Examples

Full LikeC4 dynamic view docs: https://likec4.dev/dsl/views/dynamic/

Common scenarios:

- **Authentication flow** — customer → login → auth-service → database
- **CQRS pattern** — command → service → write-db (parallel: query-handler → read-db)
- **Webhook callback** — external-system → api (parallel within with navigateTo service-webhook-handler)
- **Pub/Sub flow** — publisher → message-bus → consumer (with parallel for multiple subscribers)

When the prompt asks for one parallel fan-out, keep sibling actions inside one `parallel { ... }` block. Do not split the three steps into separate one-step blocks.

### Sequence variant

```likec4
dynamic view checkout-flow {
  variant sequence
  customer -> frontend -> api
  customer <- frontend <- api
}
```

Use `variant sequence` when the prompt explicitly asks for UML-style sequence rendering.

## Quick anti-patterns

- Rewriting a requested chain as separate top-level steps
- Using forward arrows where the prompt explicitly asks for response arrows back out
- Spreading one requested parallel fan-out across multiple `parallel` blocks
- Omitting required hop-local tokens such as `technology` or `navigateTo`
