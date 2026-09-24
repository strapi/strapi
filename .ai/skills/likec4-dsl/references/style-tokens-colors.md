# Style Tokens and Colors (LikeC4 DSL)

## Canonical color tokens (semantic names)

LikeC4 provides a curated set of semantic color tokens. **Prefer these named tokens over raw hex colors** for consistency and automatic light/dark theme adaptation.

### Core semantic token palette

| Token       | Usage                              | Light appearance | Dark appearance |
| ----------- | ---------------------------------- | ---------------- | --------------- |
| `primary`   | Primary brand color, main emphasis | #2F80ED (blue)   | lighter blue    |
| `secondary` | Secondary accent, de-emphasis      | #7C3AED (purple) | lighter purple  |
| `muted`     | Muted text, disabled states        | #9CA3AF (gray)   | lighter gray    |
| `slate`     | Neutral backgrounds, borders       | #475569          | lighter slate   |
| `blue`      | Technical/IT systems               | #3B82F6          | lighter blue    |
| `indigo`    | Data/analytics systems             | #6366F1          | lighter indigo  |
| `sky`       | Cloud, external services           | #0EA5E9          | lighter sky     |
| `red`       | Alerts, critical systems           | #EF4444          | lighter red     |
| `gray`      | Infrastructure, generic            | #6B7280          | lighter gray    |
| `green`     | Success, operational systems       | #10B981          | lighter green   |
| `amber`     | Warnings, async/queue patterns     | #F59E0B          | lighter amber   |

## Correct usage: semantic tokens

```likec4
specification {
  element service {
    style { color primary }    // ✓ Correct: semantic token
  }
  element critical {
    style { color red }        // ✓ Correct: semantic token
  }
  element queue {
    style { color amber }      // ✓ Correct: semantic token
  }
}
```

## When hex colors are acceptable

Hex colors can be used if you define a custom named color in the specification:

```likec4
specification {
  color my-brand-blue #003366   // Define a custom named token

  element service {
    style { color my-brand-blue } // Reference the custom token
  }
}
```

**Do not use raw hex colors directly in styles without first defining them as named tokens in the specification.**

## What NOT to do

```likec4
style { color #FF5733 }      // ✗ Wrong: raw hex color
style { color rgb(255,87,51) } // ✗ Wrong: rgb() notation
style { color "primary" }    // ✗ Wrong: quoted string (remove quotes)
```

## Style tokens vs. theme colors

- **Semantic tokens** (`primary`, `secondary`, `muted`, etc.) automatically adapt to light/dark mode.
- **Custom named colors** defined in specification are explicit hex values; use them sparingly for brand colors.
- **Raw hex** in a style property is not recommended — always register in specification first.

## Icon packs

Icons use the format `group:name` (e.g. `tech:react`, `aws:lambda`, `azure:app-service`). Five built-in groups are available:

| Group       | Count | Examples                                       |
| ----------- | ----- | ---------------------------------------------- |
| `aws`       | ~307  | `aws:lambda`, `aws:s3`, `aws:dynamo-db`        |
| `azure`     | ~614  | `azure:app-service`, `azure:cosmos-db`         |
| `gcp`       | ~216  | `gcp:cloud-run`, `gcp:bigquery`                |
| `tech`      | ~2000 | `tech:react`, `tech:postgresql`, `tech:docker` |
| `bootstrap` | ~2051 | `bootstrap:gear`, `bootstrap:person`           |

To get the full up-to-date list, run `likec4 list-icons` or `likec4 list-icons --group tech` (see `references/cli.md`)

## Complete style example

```likec4
specification {
  color brand-orange #FF8C42     // Custom brand color

  element actor {
    style {
      shape person
      color primary
      icon tech:user
    }
  }

  element service {
    style {
      shape component
      color primary
      icon tech:gear
    }
  }

  element critical-service {
    style {
      shape component
      color red      // Critical system
      icon tech:alert
    }
  }

  element queue {
    style {
      shape queue
      color amber    // Async/queue pattern
    }
  }
}

model {
  customer = actor {
    style { color primary }
  }

  api = service {
    style { color primary }
  }

  alert-responder = critical-service {
    style { color red }
  }

  job-queue = queue {
    style { color amber }
  }
}
```

## Summary

| Use case              | Correct                                                                              | Incorrect                   |
| --------------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| Brand primary color   | `style { color primary }`                                                            | `style { color "#2F80ED" }` |
| Critical system alert | `style { color red }`                                                                | `style { color "#FF0000" }` |
| Async/queue pattern   | `style { color amber }`                                                              | `style { color "#FFC107" }` |
| Custom brand color    | Define in spec + use token: `color my-brand #XXXXXX` then `style { color my-brand }` | Use raw hex in style        |
| Theme-aware styling   | Use semantic tokens (`primary`, `secondary`, etc.)                                   | Use fixed hex values        |

**Best practice:** Use semantic color tokens for all element and relationship coloring. Define custom named colors in specification only for brand compliance, never use raw hex in styles.
