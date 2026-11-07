import { Filters } from '@strapi/admin/strapi-admin';
import { Box, Flex } from '@strapi/design-system';

import type { ReadOnlyQuery } from '../utils/toReadOnlyQuery';

const keepAsItIs = () => {};

interface QueryChipsProps {
  query: ReadOnlyQuery;
}

/**
 * The rows of a condition's query as the builder draws them, the admin's own filter chips, which
 * here can't be changed or removed.
 */
const QueryChips = ({ query }: QueryChipsProps) => (
  <Filters.Root
    options={query.options}
    filters={query.filters}
    onFiltersChange={keepAsItIs}
    disabled
  >
    <Box style={{ pointerEvents: 'none' }}>
      <Flex gap={2} wrap="wrap" alignItems="center">
        <Filters.List />
      </Flex>
    </Box>
  </Filters.Root>
);

export { QueryChips };
export type { QueryChipsProps };
