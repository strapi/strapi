---
title: MIME type validation
slug: /upload/mime-validation
tags:
  - upload
  - security
---

# MIME type validation (simplified matrix)

This page documents how Strapi's Upload plugin validates file MIME types when upload security configuration is enabled (`plugin::upload.security` with `allowedTypes` and/or `deniedTypes`).

## Inputs (conceptual)

- **Detected MIME**: MIME type detected from file bytes (`file-type`) — may be present or missing
- **Declared MIME**: MIME type declared by the multipart upload (client/proxy provided)
- **Extension**: filename extension (e.g. `.png`)
- **Extension MIME**: MIME mapped from extension via `mime-types.lookup(ext)` (may be unknown / `null`)
- **Allowed?**: whether a MIME passes `allowedTypes`/`deniedTypes` (`isMimeTypeAllowed`)

## Step 1: Did we detect a MIME from bytes?

### A) Detection succeeded (Detected MIME exists)

| Extension state                                                                   | Outcome                                                                             |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Extension exists, Extension MIME is known, and **Detected MIME ≠ Extension MIME** | **Reject** (content vs extension mismatch)                                          |
| Otherwise                                                                         | Validate allow/deny using **Detected MIME** → **Allow if Allowed?** else **Reject** |

### B) Detection did not succeed (no Detected MIME)

Now we may fall back to the **Declared MIME**, but only if it’s trustworthy.

| Declared MIME                                         | Extension state                                                                              | Outcome                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------- |
| Generic/missing (`application/octet-stream` or empty) | any                                                                                          | **Reject** (“cannot verify”)          |
| Specific                                              | No extension                                                                                 | **Allow if Allowed?** else **Reject** |
| Specific                                              | Extension exists and **Extension MIME === Declared MIME**                                    | **Allow if Allowed?** else **Reject** |
| Specific                                              | Extension exists and **Extension MIME !== Declared MIME** (including unknown Extension MIME) | **Reject**                            |

## Notes / nuances

- When detection **succeeds**, an **unknown/unmappable** extension does **not** trigger the mismatch-rejection (the mismatch check only runs when the Extension MIME is known).
- When detection **fails**, an extension that exists but is **unmappable** is treated like a mismatch and is **rejected** (unless there is **no** extension at all).
