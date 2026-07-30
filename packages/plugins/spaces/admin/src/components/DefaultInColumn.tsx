import { Box, Flex, Typography } from '@strapi/design-system';

import { useGetMineSpacesQuery } from '../services/spaces';

interface DefaultInColumnProps {
  /** Slugs of the spaces the locale is the effective default in. */
  value: string[];
}

/**
 * Table cell showing which spaces a locale is the default locale of. Fed by the
 * `isDefaultIn` array the patched i18n locales service attaches to each row
 * (via the spaces default-locale strategy's `listDefaults`).
 */
export const DefaultInColumn = ({ value }: DefaultInColumnProps) => {
  const { data: spaces, isLoading } = useGetMineSpacesQuery();

  if (isLoading || !spaces || spaces.length < 2) {
    return null;
  }

  if (!value || value.length === 0) {
    return (
      <Typography textColor="neutral500" aria-hidden>
        —
      </Typography>
    );
  }

  const bySlug = new Map(spaces.map((s) => [s.slug, s]));

  return (
    <Flex gap={1} wrap="wrap">
      {value.map((slug) => {
        const space = bySlug.get(slug);
        return (
          <Flex key={slug} alignItems="center" gap={1}>
            <Box
              width="6px"
              height="6px"
              borderRadius="50%"
              background={space?.color ?? 'neutral300'}
              shrink={0}
            />
            <Typography variant="pi" textColor="neutral700">
              {space?.name ?? slug}
            </Typography>
          </Flex>
        );
      })}
    </Flex>
  );
};
