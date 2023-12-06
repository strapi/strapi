import { Box, Flex, Icon, IconButton, Status, Typography } from '@strapi/design-system';
import { Cross, Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../utils/translations';
import {
  DisconnectButton,
  LinkEllipsis,
  ChildrenWrapper,
  FlexWrapper,
} from '../Relations/RelationInput';
import { PUBLICATION_STATES } from '../Relations/RelationInputDataManager';

interface RelationDragPreviewProps {
  status: typeof PUBLICATION_STATES.DRAFT | typeof PUBLICATION_STATES.PUBLISHED;
  displayedValue: string;
  width: number;
}

const RelationDragPreview = ({ status, displayedValue, width }: RelationDragPreviewProps) => {
  const { formatMessage } = useIntl();

  const stateMessage = {
    [PUBLICATION_STATES.DRAFT]: formatMessage({
      id: getTranslation('relation.publicationState.draft'),
      defaultMessage: 'Draft',
    }),

    [PUBLICATION_STATES.PUBLISHED]: formatMessage({
      id: getTranslation('relation.publicationState.published'),
      defaultMessage: 'Published',
    }),
  };

  const statusColor = status === PUBLICATION_STATES.DRAFT ? 'secondary' : 'success';

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
      >
        <FlexWrapper gap={1}>
          <IconButton aria-label="" borderWidth={0}>
            <Drag />
          </IconButton>
          <ChildrenWrapper maxWidth="100%" justifyContent="space-between">
            <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
              <LinkEllipsis href="">
                <Typography textColor="primary600" ellipsis>
                  {displayedValue}
                </Typography>
              </LinkEllipsis>
            </Box>
            {status && (
              <Status variant={statusColor} showBullet={false} size="S">
                <Typography fontWeight="bold" textColor={`${statusColor}700`}>
                  {stateMessage[status]}
                </Typography>
              </Status>
            )}
          </ChildrenWrapper>
        </FlexWrapper>
        <Box paddingLeft={4}>
          <DisconnectButton type="button">
            <Icon width="12px" as={Cross} />
          </DisconnectButton>
        </Box>
      </Flex>
    </Box>
  );
};

export { RelationDragPreview };
export type { RelationDragPreviewProps };
