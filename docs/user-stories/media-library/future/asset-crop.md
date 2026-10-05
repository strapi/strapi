# Media Library Asset Crop (Unstable)

> Source: `tests/e2e/tests/media-library/future/asset-crop.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Crop an image from the asset details drawer

**As a** content editor managing media **I want** to crop an image directly from its details drawer, either replacing the original or saving the crop as a new copy **so that** I can adjust an asset's framing without leaving the Media Library.

### Acceptance Criteria

- **Given** the grid view **When** I click the "ted_lasso_profile.jpeg" card **Then** the asset details drawer opens.
- **Given** the asset details drawer is open **When** I open the crop editor and apply the crop (default crop area = full image) **Then** a "File cropped" toast is shown **And** the asset details drawer remains visible.
- **Given** the asset details drawer is open **When** I open the crop editor and save the crop as a copy in the same folder **Then** a "Copy created" toast is shown.
