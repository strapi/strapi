# Views

Three types of views are supported:

1. Element views - projections of the model, based on predicates
2. Dynamic views - step-by-step sequence of interactions between elements
3. Deployment views - projections of the deployment model, based on predicates

View IDENTIFIER must be unique within the project, available across all files. Duplicate identifiers will result in a validation error.
There is special view - `index`, if not defined, it will be automatically created to include all top-level elements.

Syntax:

```likec4
views {

  LOCAL_STYLE_RULES     // optional style rules, applied to all views in this block

  // element view
  view IDENTIFIER {
    TAGS                // optional tags, must come first if present, before any properties
    PROPERTIES          // optional, but must come before any view rules
    ELEMENT_VIEW_RULES
  }
  // element view can also be scoped to a specific element, explained below
  view IDENTIFIER of ELEMENT_ID {
    TAGS
    PROPERTIES
    ELEMENT_VIEW_RULES
  }
  // dynamic views
  dynamic view IDENTIFIER {
    TAGS
    PROPERTIES
    DYNAMIC_VIEW_RULES
  }
  // deployment views
  deployment view IDENTIFIER {
    TAGS
    PROPERTIES
    DEPLOYMENT_VIEW_RULES
  }
}
```

## Element View Rules

Syntax:

```likec4
include PREDICATE, PREDICATE, ...
exclude PREDICATE, PREDICATE, ...
style ELEMENT_EXPRESSION, ... {
  // Apply style properties to elements matching the expressions
}
global style STYLE_GROUP_IDENTIFIER
autoLayout TopBottom|BottomTop|LeftRight|RightLeft [rankSep] [nodeSep]
```

See [Predicates](./predicates.md) for more information on predicates and expressions.

**Important:**

- Rules order matters, as every next rule applies on top of the previous, accumulating result.
- `exclude` only removes elements that were included by previous rules.
- `style` rules override previously applied styles.
  - Style cascade (each override the previous): Spec defaults → element properties → local styles → view-level styles → customized predicates

## Dynamic View Rules

Syntax:

```text
STEP ::=
   SOURCE -> TARGET [LABEL]       // forward message
   | SOURCE <- TARGET [LABEL]     // backward message
   [{
      RELATIONSHIP_PROPERTIES
      RELATIONSHIP_STYLE_PROPERTIES
   }]


DYNAMIC_VIEW_STYLE_RULE ::=
   style EXPRESSION, ... {
      // Apply style properties to elements matching the expressions
   }


DYNAMIC_VIEW_RULES ::=
   STEP
   STEP
   DYNAMIC_VIEW_STYLE_RULE
   ...
```

## Local Style Rules

Styles placed inside `views {}` but outside any `view {}` apply to all views in that block:

```likec4
views {
  // This style applies to ALL views in this block
  style * { color green }

  view view1 {
    include *                      // All elements are green
  }
  view index {
    include *
    style backend { color red }    // All elements are green, except backend which is red
  }
}
```

## Global Style Groups

Reusable style groups defined in `global { ... }`:

Syntax:

```likec4
global {
  styleGroup GROUP_IDENTIFIER {
    style EXPRESSION { ... }
    style EXPRESSION { ... }
  }
}

views {
  view index {
    global style GROUP_IDENTIFIER
  }
}
```

```likec4
global {
  styleGroup brandColors {
    style * { color primary }
    style element.tag = #deprecated { color muted; opacity 30% }
    style element.tag = #critical { color red; border dashed }
  }
}

views {
  view index {
    include *
    global style brandColors    // Apply the style group
  }
}
```

Style groups can contain multiple `style` rules. They are applied in the order defined within the group. When used in a view, global styles sit between local styles and view-level styles in the cascade.

# Dynamic Views — Detailed Reference

## Steps

Each step represents an interaction between two elements:

```likec4
// Forward step
customer -> frontend "opens app"

// Backward step (response/return flow)
frontend <- backend "returns data"

// Step with full properties
customer -> frontend "places order" {
  title "Customer places an order"       // Override step label
  description "Detailed description"
  technology "HTTPS"
  notes '''
    Additional notes displayed in sidebar.
    Supports **Markdown** formatting.
  '''
  color red
  navigateTo order-detail                // Link to another dynamic view
}
```

Step properties: `title`, `description`, `technology`, `notes`, `navigateTo`, all relationship properties.

### Chained Steps

Steps can be chained to reduce repetition:

```likec4
customer
  -> frontend "opens"     // Read as "customer opens frontend"
  -> backend "requests"   // Read as "frontend requests backend"
  -> database "queries"   // Read as "backend queries database"
  <- backend "responds"   // Read as "database responds to backend"
```

Each arrow in the chain creates a separate step. The target of the previous step becomes the source of the next.

## Parallel Steps

Use `parallel` (or `par`) blocks for concurrent interactions:

```likec4
dynamic view flow {
  frontend -> backend "requests data"

  parallel {
    backend -> cache "checks cache"
    backend -> database "queries DB"
    backend -> external-api "fetches enrichment"
  }

  backend -> frontend "returns aggregated data"
}
```

Parallel blocks can be nested and mixed with sequential steps.

## Variants

| Variant             | Rendering                     | Use case                           |
| ------------------- | ----------------------------- | ---------------------------------- |
| `diagram` (default) | Animated box-and-line diagram | General flow visualization         |
| `sequence`          | UML sequence diagram          | API call sequences, protocol flows |

### Using `variant sequence`

The `variant sequence` keyword renders the dynamic view as a UML sequence diagram. This is especially useful for API call sequences and protocol flows.

**Key syntax points:**

- Use `variant sequence` at the start of the dynamic view block
- Use `->` for forward/call direction
- Use `<-` for backward/return direction (not `->` with different semantics)
- Sequence diagrams work best with leaf elements (not containers)

```likec4
dynamic view api-sequence {
  variant sequence

  client -> gateway "POST /orders"
  gateway -> auth "validate token"
  auth <- gateway "200 OK"
  gateway -> orders "create order"
  orders -> db "INSERT"
  orders <- db "order_id"
  gateway <- orders "201 Created"
  client <- gateway "201 Created"
}
```

**Common mistake:** Using `->` for returns instead of `<-`. The arrow direction indicates message flow:

- `a -> b` means "a sends to b" (request/call)
- `a <- b` means "b sends to a" (response/return)

```likec4
// ❌ WRONG - using -> for returns
dynamic view wrong {
  variant sequence
  client -> gateway "request"
  gateway -> client "response"  // This renders incorrectly!
}

// ✅ CORRECT - using <- for returns
dynamic view correct {
  variant sequence
  client -> gateway "request"
  client <- gateway "response"  // Proper return flow
}
```

## Include in Dynamic Views

Dynamic views support the same predicates as element views, used to add context elements that don't participate in steps:

```likec4
dynamic view flow {
  customer -> frontend "opens"
  frontend -> backend "requests"

  // Add parent containers as visual context
  include cloud with {
    color muted
    opacity 10%
  }
  include amazon
}
```

## Styling in Dynamic Views

Same styling rules as element views:

```likec4
dynamic view flow {
  customer -> frontend "opens"
  frontend -> backend "requests"

  style customer { color green }
  style * { size sm }
  style frontend { color muted }
}
```
