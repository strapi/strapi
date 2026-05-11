# Common Mistakes & Debugging (LikeC4 DSL)

Load this file when encountering validation errors, unexpected rendering, or when an eval answer is failing.

## Syntax Errors

| Error                                     | Cause                                     | Fix                                                                |
| ----------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| "Identifier PAYMENT.API not found"        | Dots in identifier name                   | Use `payment-api` not `payment.api`; dots are FQN separators only  |
| "Unknown kind SERVICE"                    | Kind not in specification                 | Define `element service { ... }` in the specification block        |
| "Duplicate FQN cloud.backend"             | Element ID repeated under the same parent | Rename one element; each sibling must have a unique identifier     |
| "Expected property TYPE after include \*" | Malformed filter predicate                | Use `include * where kind is component`, not `include * component` |
| "Invalid relationship kind async-cache"   | Kind not found in specification           | Define `relationship async-cache { ... }` in specification first   |

## Model & Hierarchy

| Error                                            | Cause                                           | Fix                                                                       |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------- |
| Element shows but relationships don't render     | Relationship references FQN incorrectly         | Use exact FQN matching the model hierarchy                                |
| "Can't define relationship from parent to child" | Direct parent-child relationships are forbidden | Move the relationship outside the parent element or use implicit notation |
| Child element not visible from other files       | Referencing by short name instead of FQN        | Import or use full FQN: `cloud.backend.api`                               |
| Extend block adds duplicate tags                 | Tags stack on merge                             | Use consistent tag names; duplicates are not deduplicated automatically   |

## View Predicates

| Error                                       | Cause                              | Fix                                                                               |
| ------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `include *` shows grandchildren             | Confusing `*` with `**`            | `*` = direct children only; use `**` for recursive descent                        |
| Relationships disappear in scoped view      | Neighbors not explicitly included  | Add `include -> scope` or `include <-> scope` to pull in inbound/outbound sources |
| "WHERE predicate not matching any elements" | Tag or kind name is case-sensitive | Use exact case: `#Critical` ≠ `#critical`                                         |
| Element included but styled differently     | Global vs. local style conflict    | Local view styles override global; audit style rules order in the view block      |

## Deployment

| Error                                         | Cause                                           | Fix                                                                            |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `instanceOf` doesn't resolve                  | Instance refers to wrong FQN                    | Use the exact logical model FQN, not the deployment node identifier            |
| "Undefined DEPLOYMENT_KIND"                   | Kind referenced but not in specification        | Define `deploymentNode vm { ... }` in specification                            |
| Deployment relationship inherits unexpectedly | Logical model edges are inherited automatically | Suppress inherited relationships explicitly in the deployment view if unwanted |

## Dynamic Views

| Error                                       | Cause                                       | Fix                                                                     |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Parallel block renders incorrectly          | Nested `parallel { parallel { ... } }`      | Flatten: put all concurrent steps in a single `parallel { }` block      |
| Response arrows (`<-`) show wrong direction | Chaining mixes `->` and `<-` inconsistently | Use symmetric chains: `a -> b -> c` then `c <- b <- a` for returns      |
| `navigateTo` link doesn't work              | Target view name does not exist             | Ensure the target view name exists in the same project                  |
| `variant sequence` is ignored               | Wrong keyword or spelling                   | Use exact: `variant sequence` (not `type`, `mode`, or `sequence` alone) |

## Validation & Import

| Most Common                                         | Solution                                                                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `validate` reports config not found                 | Ensure `likec4.config.json` exists in the project root directory                                                                                                       |
| Imported file shows "Module not resolved"           | Use correct relative path: `import { x } from './path/to/file.c4'`                                                                                                     |
| Symbol from import invisible in model               | Symbol must be public (defined at top level); nested elements need FQN                                                                                                 |
| Large error count in project but your file is clean | Use `likec4 validate --json --no-layout --file <edited-file> <project-dir>` and check `filteredErrors`/`filteredFiles`; text mode may still print upstream diagnostics |

## Performance & Large Models

| Symptom                        | Cause                                                      | Action                                                             |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Validation takes >30s          | Specification changes trigger full project re-parse        | Keep specification in a separate file; avoid editing it frequently |
| Export generates a partial PNG | Layout engine timeout on complex view                      | Split large views with `navigateTo` or reduce the element count    |
| IDE responsiveness slow        | Too many open files or large specification in working file | Split into `spec.c4` + `model.c4` + `views.c4`                     |

## Debugging Workflow

When encountering errors, follow these steps in order:

1. **Run validation with `--file` and check `filteredErrors`:**

   ```bash
   likec4 validate --json --no-layout --file <your-file> <project-dir>
   ```

   If `filteredErrors` = 0 but `totalErrors` > 0, your file is clean; the error is in an upstream file.

2. **Check FQN integrity:** Find the identifier from the error message and verify it matches the model hierarchy exactly.

3. **Isolate predicate issues:** Copy the failing `include`/`exclude` rule into a new minimal test view to confirm predicate semantics in isolation.

4. **Validate specification first:** Comment out `model`, `deployment`, and `views`; validate the `specification` block alone. If it passes, uncomment the next block and repeat.

5. **Use `extend` strategically:** When enriching elements across files, use `extend FQN { }` rather than re-declaring — re-declarations cause duplicate FQN errors.

## Skill Best Practices

1. **Always start with project structure understanding.** Use the `understand-project-structure` skill before making changes to an unfamiliar project.
2. **For relationship ambiguity, always include KIND + TITLE.** When source/target/kind match multiple relationships, include title in the matcher to avoid silently targeting the wrong one.
3. **Response discipline on strict prompts.** Output one final answer first (no alternatives) when the prompt says "exact", "minimal", or "paste-ready".
4. **Validate after each file edit.** Always run `likec4 validate --json --no-layout --file <edited-file> <project-dir>` after changes; use `--file` to focus on your changes only.
5. **Cross-file references use FQN.** Never assume short names resolve across file boundaries; they don't.
6. **Keep specification stable.** Changes invalidate the entire model parse; prefer a separate `spec.c4` file and minimize changes to it.
7. **Test wildcard semantics locally.** When unsure whether `*` or `**` is correct, create a minimal test view to confirm behavior before committing.
