import { isAIMetadataSupportedMime } from '../../../shared/constants';
import { useGetUploadSettingsQuery } from '../services/settings';

import { useAIMetadataAvailability } from './useAIMetadataAvailability';
import { useMediaLibraryPermissions } from './useMediaLibraryPermissions';

/**
 * Whether the replace flow will actually regenerate AI metadata, so the UI only
 * promises it when it happens.
 *
 * Two independent gates, both required — `GET /upload/settings` returns the
 * stored `aiMetadata` toggle on its own, which stays `true` (its default) when
 * no AI metadata provider is registered, so the setting alone over-promises.
 * `aiMetadataAvailable` is the server telling us a provider is registered
 * (Strapi-managed or custom). The server's own check (`aiMetadata.isEnabled()`)
 * ANDs the same two conditions.
 *
 * Pass `{ mime }` to add the third gate the replace flow applies: it only
 * regenerates metadata for images the AI provider can read
 * (`admin-upload.replaceFile` → `aiMetadata.processFiles`, which filters on this
 * same allowlist). Promising it for a PDF — or for a GIF, which clears the
 * server's looser `image/*` gate but is skipped by the provider — would describe
 * something that never happens.
 *
 * The argument is an object rather than a bare `mime` so the two intents stay
 * distinguishable: `File.mime` is optional on the contract, so a positional
 * parameter let `useAIMetadataEnabled(asset.mime)` collapse into the ungated
 * call whenever the mime was missing — silently taking the permissive path this
 * hook exists to close. `useAIMetadataEnabled({ mime: undefined })` still gates
 * (and fails closed); only an omitted `options` skips the mime check.
 */
export const useAIMetadataEnabled = (options?: { mime?: string | null }): boolean => {
  const isAIAvailable = useAIMetadataAvailability();
  // Without `plugin::upload.read` the request 403s, and AI metadata is moot
  // anyway — a role that cannot read the library cannot generate it.
  const { canRead } = useMediaLibraryPermissions();
  const { data: settings } = useGetUploadSettingsQuery(undefined, { skip: !canRead });

  if (!isAIAvailable || !(settings?.data?.aiMetadata ?? false)) {
    return false;
  }

  return options === undefined ? true : isAIMetadataSupportedMime(options.mime);
};
