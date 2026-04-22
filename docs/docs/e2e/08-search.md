---
sidebar_position: 9
sidebar_label: Search
---

# Search

End-to-end coverage for the Content Manager's search feature, verifying that queries filter list views correctly across a range of character sets.

## Overview

The search suite exercises the list-view search control in the Content Manager by creating a document with a known name, issuing a search for that name, and asserting that the results table is filtered to exactly the matching row. The suite is organised around a parameterised helper so that the same flow can be repeated for multiple input types (plain ASCII, extended ASCII, Unicode, emojis, special characters and mixed encodings). Cases beyond the baseline ASCII scenario are currently marked as `fixme` pending backend support, but they are retained to document the intended behaviour and to prioritise future work.

## Test specs

### `search/content-type.spec.ts` — Content Manager list-view search

**Purpose:** Verify that searching within a content type's list view filters the results to entries whose name matches the supplied search term across various character encodings.

**Preconditions:**

- The database is reset and re-seeded from the `with-admin` data transfer snapshot before each test.
- The user navigates to `/admin` and logs in with the default admin credentials.
- The user is then routed to the Content Manager and opens the `Products` collection, where an existing product is already present as baseline data.

**Scenarios covered:**

- `Search` -> `ASCII (no spaces)`: Creates a product named `TestMe`, searches for the same term, and asserts that the results table contains exactly two rows (the header row and the single matching entry), confirming the baseline ASCII search path.
- `Search` -> `ASCII (spaces)` (fixme): Exercises a multi-word ASCII term (`Product 2`) to ensure that searches containing whitespace are handled correctly. Currently skipped pending support.
- `Search` -> `extended ASCII` (fixme): Uses `Cafe` with an accented character to validate that extended ASCII / Latin-1 characters are matched. Currently skipped pending support.
- `Search` -> `Unicode` (fixme): Uses CJK characters to verify that non-Latin Unicode terms can be indexed and retrieved. Currently skipped pending support.
- `Search` -> `emojis` (fixme): Searches for an emoji-only term to ensure that multi-byte characters outside the Basic Multilingual Plane are handled. Currently skipped pending support.
- `Search` -> `Special characters` (fixme): Uses reserved URL and query characters (`&`, `=`, `+`, `#`) inside a product name to confirm that special characters are correctly encoded and matched. Currently skipped pending support.
- `Search` -> `Mixed encoding` (fixme): Combines Unicode, emoji, extended ASCII and special characters in a single term to exercise end-to-end normalisation. Currently skipped pending support.

The file also carries `TODO` markers for two planned scenarios that are not yet implemented: clearing the search box and searching with an extremely long string.
