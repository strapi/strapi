# Specification (LikeC4 DSL)

The `specification` block defines all named vocabularies for the project: element kinds, deployment node kinds, relationship kinds, tags, and custom color tokens. Every kind used in `model` or `deployment` blocks must be declared here first.

**Key rules:**

- Specification is global across all files in the project.
- Duplicate identifiers (same kind, same tag, etc.) will cause a validation error.
- Multiple `specification` blocks (in one file or across files) are allowed, but not recommended.
- Keep specification in a dedicated file, e.g. `specification.c4` — changes to specification trigger a full project re-parse, so isolating it reduces edit latency on model/view files.

## Syntax

```likec4
specification {
  // Define a tag; outside specification it is referenced as #IDENTIFIER
  tag IDENTIFIER

  // Define element kind for use in model
  element IDENTIFIER {
    #tag-1 #tag-2          // tags applied to all elements of this kind
    title "default title for this kind"
    technology "default tech for this kind"
    description "default description for this kind"
    notation "legend title for this kind"
    style { ... }          // see references/style-tokens-colors.md
  }

  // Define deployment node kind for use in deployment block
  deploymentNode IDENTIFIER {
    // same properties and styles as element kind
  }

  // Define relationship kind with default properties and styles
  relationship IDENTIFIER {
    technology "default tech for this relationship kind"
    description "default description for this relationship kind"
    style { ... }          // default style for this relationship kind
  }

  // Define a custom named color token
  color IDENTIFIER #FFFFFF  // or rgba(255,255,255,1)
}
```

## Example

```likec4
specification {
  element actor    { notation "Person";    style { shape person } }
  element service  { description "Same for all of the kind"; style { shape component } }
  element webapp   { style { shape browser } }
  element queue    { style { shape queue; color secondary } }
  element database { style { shape storage } }
  element system

  relationship async { color amber; line dotted; head diamond; tail vee }
  relationship sql   { technology "SQL"; line dashed }

  tag deprecated
  tag critical

  deploymentNode environment { notation "Environment"; style { color gray } }
  deploymentNode zone        { notation "Network Zone" }
  deploymentNode vm
}
```

## Common Mistakes

| Mistake                          | Fix                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Using a kind not defined here    | Define `element KIND { }` or `deploymentNode KIND { }` in specification first                 |
| Duplicate tag or kind identifier | Each identifier must be unique within its type category                                       |
| `#tag` in specification argument | Tags are defined without `#`; they are used with `#` elsewhere: `tag critical` → `#critical`  |
| Raw hex color in style           | Define a named color token first: `color my-blue #003366`, then use `color my-blue` in styles |
