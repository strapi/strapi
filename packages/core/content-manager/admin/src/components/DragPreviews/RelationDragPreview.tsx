import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Cross, Drag } from '@strapi/icons';

import { DocumentStatus } from '../../pages/EditView/components/DocumentStatus';
import {
  DisconnectButton,
  LinkEllipsis,
  FlexWrapper,
} from '../../pages/EditView/components/FormInputs/Relations';

import type { Data } from '@strapi/types';

interface RelationDragPreviewProps {
  status?: string;
  displayedValue: string;
  id: Data.ID;
  index: number;
  width: number;
}

const RelationDragPreview = ({ status, displayedValue, width }: RelationDragPreviewProps) => {
  return (
    <Box style={{ width }}>
      <Flex
        paddingTop={2}
        paddingBottom={2}
        paddingLeft={2}
        paddingRight={4}
        hasRadius
        borderWidth={1}
        background="neutral0"
        borderColor="neutral200"
        justifyContent="space-between"
        gap={4}
      >
        <FlexWrapper gap={1}>
          <IconButton withTooltip={false} label="" variant="ghost">
            <Drag />
          </IconButton>
          <Flex width="100%" minWidth={0} justifyContent="space-between">
            <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
              <LinkEllipsis href="">
                <Typography textColor="primary600" ellipsis>
                  {displayedValue}
                </Typography>
              </LinkEllipsis>
            </Box>
            {status ? <DocumentStatus status={status} /> : null}
          </Flex>
        </FlexWrapper>
        <DisconnectButton type="button">
          <Cross width="12px" />
        </DisconnectButton>
      </Flex>
    </Box>
  );
};

export { RelationDragPreview };
export type { RelationDragPreviewProps };
