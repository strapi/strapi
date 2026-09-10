/* eslint-disable check-file/filename-naming-convention */
import type * as React from 'react';

import type { Release } from '../../shared/contracts/releases';

/**
 * Extension points other plugins can use to augment the release details page
 * without content-releases depending on them (today's consumer:
 * @strapi/plugin-spaces, which shows a per-workspace readiness and keeps
 * publishing to the default workspace). Registration happens during the
 * consumer's `register`/`bootstrap`, before any page renders, so plain module
 * state is enough — same pattern as i18n's `i18n-plugin.ts`.
 */
interface ReleaseDetailsExtensionProps {
  release: Pick<Release, 'id' | 'name' | 'status'>;
}

interface ReleaseDetailsExtension {
  id: string;
  /** Rendered in the page header, next to the release status. */
  Component: React.ComponentType<ReleaseDetailsExtensionProps>;
  /** When it returns false, the Publish button is not offered. */
  isPublishAllowed?: () => boolean;
}

const releaseDetailsExtensions: ReleaseDetailsExtension[] = [];

export const registerReleaseDetailsExtension = (extension: ReleaseDetailsExtension) => {
  const index = releaseDetailsExtensions.findIndex((item) => item.id === extension.id);
  if (index === -1) {
    releaseDetailsExtensions.push(extension);
  } else {
    releaseDetailsExtensions[index] = extension;
  }
};

export const getReleaseDetailsExtensions = (): readonly ReleaseDetailsExtension[] =>
  releaseDetailsExtensions;

export const isPublishAllowedByExtensions = (): boolean =>
  releaseDetailsExtensions.every((extension) => extension.isPublishAllowed?.() ?? true);

export type { ReleaseDetailsExtension, ReleaseDetailsExtensionProps };
