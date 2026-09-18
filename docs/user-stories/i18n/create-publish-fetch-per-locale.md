# i18n Create, Publish & Fetch per Locale

> Source: `tests/e2e/tests/i18n/create-publish-fetch-per-locale.spec.ts`

## User Story: Publish the same document independently per locale and fetch it via `?locale=`

**As a** front-end developer consuming the REST Delivery API **I want** a document published independently in several locales **so that** querying the API with a given `?locale=` returns only that locale's content and never another locale's.

### Acceptance Criteria

- **Given** a new Article is created and published in the default English (en) locale with the title "i18n locale article EN" **When** French (fr) and Spanish (es) versions of the same document are added via the Locales switcher, filled in, and published independently **Then** the document exists as three separately published locale versions, titled "i18n locale article FR" and "i18n locale article ES" respectively.
- **Given** all three locale versions are published and the public role has been granted `find`/`findOne` on Article **When** the REST Delivery API is queried with `GET /api/articles?locale=en` **Then** the response includes "i18n locale article EN" **And** does not include the French or Spanish titles.
- **Given** the same setup **When** queried with `GET /api/articles?locale=fr` **Then** the response includes only "i18n locale article FR" **And** not the English or Spanish titles.
- **Given** the same setup **When** queried with `GET /api/articles?locale=es` **Then** the response includes only "i18n locale article ES" **And** not the English or French titles.
