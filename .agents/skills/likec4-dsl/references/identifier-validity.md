# Identifier Validity (LikeC4 DSL)

## Valid identifier form

```
identifier = /^[a-zA-Z_][a-zA-Z0-9_-]*$/
```

- **Starts with** letter or underscore
- **Contains** letters, digits, hyphens, or underscores only
- **No dots**, no spaces, no special characters

## Valid examples

| Valid             | Why                           |
| ----------------- | ----------------------------- |
| `payment-api`     | hyphens allowed               |
| `paymentAPI`      | camelCase allowed             |
| `payment_service` | underscores allowed           |
| `service1`        | digits allowed (not at start) |
| `_internal`       | underscore at start allowed   |
| `PaymentService`  | PascalCase allowed            |

## Invalid examples

| Invalid       | Why                                               | Correct form                  |
| ------------- | ------------------------------------------------- | ----------------------------- |
| `payment.api` | **dots are FQN separators**, not identifier chars | `payment-api` or `paymentApi` |
| `payment api` | spaces not allowed                                | `payment-api`                 |
| `1payment`    | cannot start with digit                           | `payment1`                    |
| `payment-`    | cannot end with hyphen                            | `payment`                     |
| `payment@api` | special chars not allowed                         | `payment-api`                 |

## Critical: dots vs. hyphens

**Dots are reserved for fully qualified names (FQN):**

```likec4
model {
  cloud.backend.payment-api   // FQN: cloud (parent) -> backend (child) -> payment-api (child identifier)
  //    ^     ^                   Dots separate hierarchy levels
  //                 |---- hyphen used in identifier name itself
}
```

**Correct identifier:** `payment-api` (with hyphen)  
**Incorrect identifier:** `payment.api` (dots are FQN syntax, not part of the name)

## Use in different contexts

| Context               | Rule                              | Example                                  |
| --------------------- | --------------------------------- | ---------------------------------------- |
| **Element name**      | Must be valid identifier          | `service name = api "payment api"` ✓     |
| **Tag name**          | Must be valid identifier          | `tag critical` ✓, `tag #critical` ✗      |
| **Relationship kind** | Must be valid identifier          | `-[async]->` ✓, `-[async-queue]->` ✓     |
| **Kind name**         | Must be valid identifier          | `element service`, `deploymentNode vm` ✓ |
| **Metadata key**      | Must be valid identifier          | `metadata { api_version "1.0" }` ✓       |
| **Color name**        | Must be valid identifier (or hex) | `color primary`, `color custom-blue` ✓   |

## When referencing by FQN

Once defined, elements are referenced using their fully qualified names (FQNs), which _do_ use dots:

```likec4
model {
  // Definition (identifier = payment-api, no dots)
  cloud = system {
    backend = container {
      payment-api = service "Payment API"
    }
  }
}

deployment {
  vm1 {
    // Reference (FQN = cloud.backend.payment-api, dots for hierarchy)
    instanceOf cloud.backend.payment-api
  }
}
```

## Summary

| Check            | Valid                                                                             | Invalid                                 |
| ---------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| Identifier rule  | `[a-zA-Z_][a-zA-Z0-9_-]*`                                                         | Contains dots, spaces, or special chars |
| Hyphens allowed? | **Yes** in identifiers                                                            | Not dots                                |
| Dots allowed?    | **Only in FQNs** (for scope separation)                                           | Never in a single identifier name       |
| `payment-api`    | ✓ identifier                                                                      | —                                       |
| `payment.api`    | ✗ identifier, but valid as FQN if `payment` and `api` are nested parents/children | —                                       |
