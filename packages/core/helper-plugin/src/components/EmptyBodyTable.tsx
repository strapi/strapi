import { Box, Flex, Loader, Tbody, Td, Tr, RawTdProps } from '@strapi/design-system';

import { EmptyStateLayout, EmptyStateLayoutProps } from './EmptyStateLayout';

export interface EmptyBodyTableProps
  extends Omit<EmptyStateLayoutProps, 'hasRadius' | 'shadow'>,
    Pick<RawTdProps, 'colSpan'> {
  isLoading?: boolean;
}

const EmptyBodyTable = ({ colSpan, isLoading = false, ...rest }: EmptyBodyTableProps) => {
  if (isLoading) {
    return (
      <Tbody>
        <Tr>
          <Td colSpan={colSpan}>
            <Flex justifyContent="center">
              <Box padding={11} background="neutral0">
                <Loader>Loading content...</Loader>
              </Box>
            </Flex>
          </Td>
        </Tr>
      </Tbody>
    );
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colSpan}>
          <EmptyStateLayout {...rest} hasRadius={false} />
        </Td>
      </Tr>
    </Tbody>
  );
};

export { EmptyBodyTable };
