import { Readable } from 'stream';
import type { Core } from '@strapi/types';

import type { ILink } from '../../../types';
import { createCappedWarningReporter } from '../../../utils/capped-warnings';
import { createLinkQuery } from '../../queries/link';

const formatOrphanedExportLinkWarning = (link: ILink) =>
  `Omitting link ${link.left.type}:${link.left.ref} -> ${link.right.type}:${link.right.ref} from export because a referenced entity no longer exists in the database.`;

export const formatOrphanedLinksExportSummary = (count: number) =>
  `Links export omitted ${count} relation(s) pointing at missing entities. Verify relations after import if this is unexpected.`;

/**
 * Create a Readable which will stream all the links from a Strapi instance
 */
export const createLinksStream = (
  strapi: Core.Strapi,
  options: { onWarning?: (message: string) => void } = {}
) => {
  const uids = [...Object.keys(strapi.contentTypes), ...Object.keys(strapi.components)] as string[];
  let orphanedLinkCount = 0;
  const warnings = createCappedWarningReporter(options.onWarning);

  const query = createLinkQuery(strapi, undefined, {
    onOrphanedLink(link) {
      orphanedLinkCount += 1;
      warnings.warn(formatOrphanedExportLinkWarning(link));
    },
  });

  // Async generator stream that returns every link from a Strapi instance
  return Readable.from(
    (async function* linkGenerator(): AsyncGenerator<ILink> {
      for (const uid of uids) {
        const generator = query().generateAll(uid);

        for await (const link of generator) {
          yield link;
        }
      }

      if (orphanedLinkCount > 0) {
        options.onWarning?.(formatOrphanedLinksExportSummary(orphanedLinkCount));
      }
    })()
  );
};
