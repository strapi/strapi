import {
  Box,
  Flex,
  Loader,
  Tbody,
  Td,
  Tr,
  RawTdProps,
  EmptyStateLayout,
  EmptyStateLayoutProps,
} from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons';
import { useIntl } from 'react-intl';

export interface EmptyBodyTableProps
  extends Omit<Partial<EmptyStateLayoutProps>, 'hasRadius' | 'shadow'>,
    Pick<RawTdProps, 'colSpan'> {
  isLoading?: boolean;
}

const EmptyBodyTable = ({ colSpan, isLoading = false, ...rest }: EmptyBodyTableProps) => {
  const { formatMessage } = useIntl();

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
          <EmptyStateLayout
            content={formatMessage({
              id: 'app.components.EmptyStateLayout.content-document',
              defaultMessage: 'No content found',
            })}
            hasRadius
            icon={<EmptyDocuments width="10rem" />}
            shadow={'tableShadow'}
            {...rest}
          />
        </Td>
      </Tr>
    </Tbody>
  );
};

export { EmptyBodyTable };
