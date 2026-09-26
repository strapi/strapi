# Decimal Field Hint

> Source: `tests/e2e/tests/content-manager/decimal-field-hint.spec.ts`

## User Story: See min/max hints for a decimal field

**As a** content editor **I want** field hints that show the configured minimum and maximum values **so that** I know the valid range when entering a decimal field.

### Acceptance Criteria

- **Given** I am a content manager in the Content-Type Builder **When** I add a decimal number field ("GDP") to the Country content type with advanced minimum 0 and maximum 100 **Then** the field is added.
- **Given** the GDP field has been added **When** I create a new Country entry in the Content Manager **Then** the GDP field shows the hint "min. 0 / max. 100" **And** the existing name field shows its configured hint "min. 3 characters".
- **Given** the test has completed **When** cleanup runs **Then** the added GDP attribute can be removed afterwards.
