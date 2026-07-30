---
title: MIME type validation
slug: /upload/mime-validation
tags:
  - upload
  - security
---

# MIME type validation

This page documents how the Upload plugin validates file MIME types when upload security is configured (`plugin::upload.security` with `allowedTypes` and/or `deniedTypes`). All accept/deny decisions go through a single helper so the logic stays simple and consistent.

## Inputs

- **declared** — Client-provided Content-Type (may be generic or missing).
- **fileName** — Upload filename (used to derive extension).
- **file** — File object (path or buffer) for content detection.
- **config** — `{ allowedTypes?: string[], deniedTypes?: string[] }`.

## Derived values

- **extension** — Filename extension (e.g. `.jpg`).
- **expectedMimeFromExt** — MIME type for that extension (`mime-types.lookup`), or null if unknown.
- **detected** — Result of `detectMimeType(file)` (content-based, e.g. via `file-type`); undefined if detection fails or throws.
- **Generic declared** — Declared is empty or `application/octet-stream`.

## Helper: validateAllowBanLists(mimetype)

All allow/deny outcomes go through this helper. It is the only place that decides accept vs reject for a given type.

- If mimetype is in **deniedTypes** → return REJECT.
- If **allowedTypes** is undefined → return ACCEPT (with stored type = mimetype).
- If **allowedTypes** is empty array → return REJECT.
- If mimetype matches any entry in **allowedTypes** (exact or pattern, e.g. `image/*`) → return ACCEPT (with stored type = mimetype).
- Else → return REJECT.

**Rule:** Whenever we have a type to evaluate, we **return validateAllowBanLists(that type)**. No extra branching on accept/deny outside this helper.

## Helper predicates

- **declaredMatchesExtension** — Declared is specific, expectedMimeFromExt is present, and declared equals (or pattern-matches) expectedMimeFromExt.
- **detectedMatchesDeclared** — Detected is defined and equals (or pattern-matches) declared.

---

## Validation steps (in order)

Steps are evaluated in sequence. Once a step returns, later steps are not run.

**1. Reject if declared type is denied.**  
If the client explicitly declared a type that is on the deny list, reject immediately. We do not use or trust that type for storage.

**2. Reject if extension's type is denied.**  
If the filename extension maps to a known MIME and that MIME is on the deny list, reject. This blocks dangerous types by extension even when declaration or detection might differ.

**3. Run content detection.**  
Set **detected** = `detectMimeType(file)`. If detection throws, treat **detected** as undefined. Detection is used later to confirm declared type, to block denied types, and as a fallback when declaration is generic or missing.

**4. Trusted declaration: declared matches extension and detection confirms.**  
If **declaredMatchesExtension** and **detectedMatchesDeclared**, we have a consistent declaration and content that matches it. Return **validateAllowBanLists(declared)**. We do not reject here just because detected might also match a denied type (e.g. polyglot -- for example, if we ban html but allow PDF, it is possible that a valid PDF with a .pdf extension could be accidentally rejected because it is detectable as html); we store the declared type. We only allow when detection confirms the file is valid for that type, so we never "trust" declared + extension without detection agreeing. This is safe because even if someone uploaded, for example, a polyglot jpg/exe file, if it has a .jpg extension and stored mimetype of jpg, the only way it could potentially be dangerous is if a user explicitly downloads, renames, AND sets the executable flag on their operating system

**5. Reject if detected type is denied.**  
If we have a detected type and it is on the deny list, reject. This applies when we did not already accept in step 4 (e.g. declared did not match extension or detection did not match declared). Blocking on detected here avoids storing content that is identified as a denied type when we are not in the "trusted declaration" path.

**5b. Reject if allow list is set and detected is not in it.**  
If **allowedTypes** is set, **detected** is defined, and detected does not match any allowed type, reject. This prevents extension or declared type from overriding content-based detection (e.g. a JPEG sent as `.pdf` with declared `application/pdf` is rejected when only PDF is allowed). **Exception:** When detected is `application/zip` and the extension maps to a type that is in the allow list (e.g. Office formats like docx, xlsx), do not reject here; step 6 will use the extension type. This is because content detection often returns `application/zip` for Office files when the buffer is small.

**6. Use detected type when it is defined and matches extension or declared is generic.**  
If **detected** is defined and (expectedMimeFromExt is missing, or detected matches extension, or declared is generic), we have a usable content-derived type. Return **validateAllowBanLists(detected)**. This is the main fallback when we do not have a trusted declaration (step 4). **Implementation note:** When detected is `application/zip` and the extension maps to a specific type in the allow list (e.g. docx), the implementation may return **validateAllowBanLists(expectedMimeFromExt)** so Office uploads are allowed.

**7. Use extension's type when present.**  
If **expectedMimeFromExt** is present, use it. Return **validateAllowBanLists(expectedMimeFromExt)**. This covers cases where detection failed or was undefined and we still have a known extension.

**8. Use declared type as last resort.**  
If **declared** is present (including generic), use it. Return **validateAllowBanLists(declared)**. For example, when allowedTypes is undefined, this allows the upload with the declared type (e.g. generic); when allowedTypes is set, only allowed declared types pass.

**9. Reject when no type can be chosen.**  
If we reach this step, we have no declared type and did not accept in 4, 6, or 7. Return REJECT (e.g. "cannot verify file type").

---

## Pseudocode (reference)

```
1. If declared is specific and declared is in deniedTypes → return REJECT.
2. If expectedMimeFromExt is present and expectedMimeFromExt is in deniedTypes → return REJECT.
3. Set detected = detectMimeType(file); if it throws, detected is undefined.
4. If declaredMatchesExtension and detectedMatchesDeclared → return validateAllowBanLists(declared).
5. If detected is defined and detected is in deniedTypes → return REJECT.
5b. If allowedTypes is set and detected is defined and detected is not in allowedTypes → return REJECT,
    except when detected is application/zip and expectedMimeFromExt is in allowedTypes (then continue).
6. If detected is defined and (expectedMimeFromExt is missing or detected matches extension or declared is generic) → return validateAllowBanLists(detected); when detected is application/zip and extension type is in allow list, implementation may use expectedMimeFromExt.
7. If expectedMimeFromExt is present → return validateAllowBanLists(expectedMimeFromExt).
8. If declared is present → return validateAllowBanLists(declared).
9. return REJECT.
```

---

## Notes

- **Deny list:** Declared and extension are checked first (steps 1–2). Detected is only used to reject when we did not accept via trusted declaration (step 5), so e.g. "allow PDF, deny HTML" does not de-facto block PDF when the file is a PDF/HTML polyglot and we correctly trust declared + extension + detection for PDF.
- **Trusted declaration:** We only allow "declared + extension" when detection confirms the same type (step 4). We never store a type without either detection confirming it or using it via steps 6–8.
- **Single gate:** All accept/deny decisions go through **validateAllowBanLists** with one of declared, detected, or expectedMimeFromExt; step 9 is the only reject that does not call the helper (no type to pass).
