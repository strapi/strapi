# Predicates

Predicates are view rules that define what elements and relationships to include or exclude from a view. Predicate types:

- Wildcard predicate - used to select all elements/relationships, based on view scope
- Element predicates - used to select elements
- Relationship predicates - used to select relationships
- Filter predicates - used to apply filters to element and relationship predicates
- Custom predicates - used to override properties of elements/relationships (can be used with `include` only)'

Syntax:

```
EXPRESSION ::= WILDCARD | ELEMENT_EXPRESSION | RELATIONSHIP_EXPRESSION
FILTER_PREDICATE ::= EXPRESSION where FILTER_CONDITIONS
CUSTOMIZE_PREDICATE ::= (EXPRESSION | FILTER_PREDICATE) with { ... }
PREDICATE ::= EXPRESSION | FILTER_PREDICATE | CUSTOMIZE_PREDICATE
```

Example:

```likec4
include *                               // WILDCARD
include some.element                    // ELEMENT_EXPRESSION
include some.from -> some.to            // RELATIONSHIP_EXPRESSION
include * where tag is #production      // FILTER_PREDICATE
include some.element with { color red } // CUSTOMIZE_PREDICATE on ELEMENT_EXPRESSION
include                                 // CUSTOMIZE_PREDICATE on FILTER_PREDICATE
  some.*
  where
    tag is #production and kind is component
  with {
    color red
  }
```

## Expressions

Expressions inside `exclude` clause match against the accumulated result of previous predicates. Expressions inside `include` clause match against the accumulated result of previous predicates and the model. Element expressions select elements first, and then relationships connected to these elements. Relationship expressions select relationships first, and then elements that are connected by these relationships.

### Element expression

- `<element_ref>` - selects element by reference from the current file scope, or globally available if not found in the current file, together with all relationships between this element and accumulated result
- `<element_ref>.<child>` - selects unique child within `<element_ref>` together with all relationships between this child and accumulated result
- `<element_ref>.*` - selects **direct children only** of `<element_ref>`, together with all relationships between these children and accumulated result
- `<element_ref>._` - selects direct children of `<element_ref>` that have relationships with accumulated result
- `<element_ref>.**` - selects **all recursive descendants** of `<element_ref>` that have relationships with accumulated result

#### Wildcard depth selectors: `*` vs `**`

Understanding the difference between `*` and `**` is crucial for correct view scoping:

| Selector | Meaning                                 | Example     | Result                                                   |
| -------- | --------------------------------------- | ----------- | -------------------------------------------------------- |
| `*`      | Direct children **only** (1 level)      | `parent.*`  | Selects immediate children of parent                     |
| `**`     | All descendants (recursive, all levels) | `parent.**` | Selects children, grandchildren, and all nested elements |

```likec4
// Example model structure:
// backend
//   ├── api (service)
//   │   └── handlers (component)
//   │       └── authHandler
//   └── db (database)

views {
  // Selects ONLY: api, db (direct children of backend)
  view direct-only {
    include backend.*
  }

  // Selects: api, db, handlers, authHandler (all descendants)
  view all-descendants {
    include backend.**
  }

  // ❌ Common mistake: expecting * to include nested elements
  view wrong-expectation {
    include backend.*        // This does NOT include handlers or authHandler!
    style backend.handlers { color red }  // handlers won't be styled
  }

  // ✅ Correct: use ** when you need all nested elements
  view correct {
    include backend.**       // Includes everything under backend
    style backend.handlers { color red }  // Now handlers IS included
  }
}
```

### Wildcard expression

Wildcard expression is a special element expression.

- If used inside a scoped view, it selects the scoped element, its direct children, and all relationships with them.
- If used inside an unscoped view, it selects top-level elements and all relationships between them.

### Relationship expression

Relationship expression uses element expressions as source and target.
If expression matches, predicate adds matched relationships together with matching source and target elements.

- `<expr1> -> <expr2>` - relationships from elements selected by `expr1` to elements selected by `expr2`
- `<expr1> -> <element_ref>.*` - relationships from elements selected by `expr1` to direct children of `element_ref`
- `<expr1> <-> <expr2>` - any relationships between elements selected by `expr1` and `expr2` (both directions)
- `-> <expr>` - any relationships, from accumulated result to the elements selected by `expr`
- `<expr> ->` - any relationships, from the elements selected by `expr` to accumulated result
- `-> <expr> ->` - any relationships, between the elements selected by `expr` and accumulated result
- `* -> *` - all relationships

## Filter Conditions

After expression is evaluated and selected elements/relationships, filter conditions are applied to refine the selection.

By tag: `* where tag is #primary` or `* where tag is not #primary`
By kind: `* where kind is component` or `* where kind is not component`

Complex:

- `* where kind is component and tag is #primary`
- `* where (tag is #primary or tag is #secondary) and kind is component`

If filter applies to relationship expressions, you can filter source/target elements:

- `* -> * where tag is #http` - filters relationships by tag
- `* -> * where source.tag is #primary` - filters relationships by tag on source element
- `* -> * where target.tag is #primary` - filters relationships by tag on target element
- `* -> * where source.kind is component or target.kind is component` - filters relationships by source or target kind

## Customize Predicates

Customize predicates allow you to override properties of selected elements/relationships per view (for example, in different diagrams).
For example:

```likec4
include
  * -> some.component.*
  where
    tag is #primary
  with {
    color red
  }
```

- Selects all relationships incoming to the children of `some.component.*`
- Filters relationships by tag `#primary`
- Overrides color of selected relationships to red
