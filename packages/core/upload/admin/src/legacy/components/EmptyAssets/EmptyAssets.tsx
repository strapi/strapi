// TODO: find a better naming convention for the file that was an index file before
import { Box, Flex, Typography } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';

import { EmptyAssetGrid } from './EmptyAssetGrid';

interface EmptyAssetsProps {
  action?: React.ReactNode;
  icon?: React.ElementType;
  content: string;
  size?: 'S' | 'M';
  count?: number;
}

export const EmptyAssets = ({
  icon: Icon = EmptyDocuments,
  content,
  action,
  size = 'M',
  count = 12,
}: EmptyAssetsProps) => {
  return (
    <Box position="relative">
      <EmptyAssetGrid size={size} count={count} />

      <Box position="absolute" top={11} width="100%">
        <Flex direction="column" alignItems="center" gap={4} textAlign="center">
          <Flex direction="column" alignItems="center" gap={6}>
            <Icon width="160px" height="88px" />

            <Typography variant="delta" tag="p" textColor="neutral600">
              {content}
            </Typography>
          </Flex>

          {action}
        </Flex>
      </Box>
    </Box>
  );
};
