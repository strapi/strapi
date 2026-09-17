# @strapi/plugin-branches

Content branches for the Strapi Content Manager: prepare a release on an isolated **branch**, review the differences, then **merge** it into `main` (or into another branch).

Built like `@strapi/plugin-spaces`: a document-service middleware plus a DB read net add a `branch` dimension to every user content type. Nothing is duplicated — a branch stores only the documents it created and the attributes it changed.

## Quick start

1. Enable the plugin:

   ```js
   // config/plugins.js
   module.exports = {
     branches: { enabled: true },
   };
   ```

2. Restart Strapi. Every `api::` content type gains a `branch_id` column (NULL = main). Opt a content type out with:

   ```json
   { "pluginOptions": { "branches": { "enabled": false } } }
   ```

3. In the admin, open **Branches** in the main navigation and create one (from `main` or from another branch), then pick it in the Content Manager list or edit view. Edit, create and delete documents as usual — main stays untouched.

4. Back on the branch page, review the changes (per-attribute diff against the parent's current values), resolve conflicts, and **Merge**.

## Storage model

| Situation                       | What happens                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document created on branch B    | A real row with `branch_id = B`. Visible on B and its child branches, hidden on main.                                                                                                                                                                                                                 |
| Inherited document edited on B  | No row is touched. One row in `strapi_branch_changes` holds the changed attributes (`changes`) and the value they had on the parent when first touched (`base`).                                                                                                                                      |
| Inherited document deleted on B | A tombstone row (`operation: delete`).                                                                                                                                                                                                                                                                |
| Read on B                       | The row, with the chain's deltas laid over it (parent-most first, child wins per attribute).                                                                                                                                                                                                          |
| Merge B into its parent         | Created rows are re-parented (one column flip); each delta is three-way merged (`base` / parent now / branch) and written through the document service on the parent; tombstones delete on the parent; the branch is marked `merged`. Conflicts block the merge until a side is picked per attribute. |

Overlays apply to the **draft** version only. Publishing, unpublishing and discarding drafts are refused on a branch: merge first, then publish on main.

## API

- Header `X-Strapi-Branch: <slug>` on admin and content API requests selects the branch (`main` or no header = trunk). Unknown, merged or archived slugs are a 400.
- Admin routes under `/branches`: `GET /mine`, `GET /`, `POST /`, `GET|PUT|DELETE /:id`, `GET /:id/changes`, `GET|DELETE /:id/changes/:uid/:documentId`, `POST /:id/merge`, `GET /states`.
- Events: `branch.create`, `branch.delete`, `branch.merge`, `branch.entry.update`, `branch.entry.delete`.
- With `@strapi/plugin-spaces` installed, branches are per workspace.

## Known limitations (v1)

- Filters, sort and search on a branch run on the base values of overlaid documents.
- Relation changes inside components of inherited documents are refused on a branch (top-level relations work).
- Inverse-relation populates from main can surface documents created on a branch (populate sub-queries bypass lifecycles, like the Spaces read net).
