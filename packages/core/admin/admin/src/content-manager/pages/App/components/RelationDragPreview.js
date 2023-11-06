import * as React from 'react';

import { Box, Flex, Icon, IconButton, Status, Typography } from '@strapi/design-system';
import { Cross, Drag } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { DisconnectButton, LinkEllipsis } from '../../../components/RelationInput';
import {
  ChildrenWrapper,
  FlexWrapper,
} from '../../../components/RelationInput/components/RelationItem';
import { PUBLICATION_STATES } from '../../../components/RelationInputDataManager/constants';
import { getTrad } from '../../../utils';

export const RelationDragPreview = ({ status, displayedValue, width }) => {
  const { formatMessage } = useIntl();

  const stateMessage = {
    [PUBLICATION_STATES.DRAFT]: formatMessage({
      id: getTrad('relation.publicationState.draft'),
      defaultMessage: 'Draft',
    }),

    [PUBLICATION_STATES.PUBLISHED]: formatMessage({
      id: getTrad('relation.publicationState.published'),
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
        borderSize={1}
        background="neutral0"
        borderColor="neutral200"
        justifyContent="space-between"
      >
        <FlexWrapper gap={1}>
          <IconButton noBorder>
            <Drag />
          </IconButton>
          <ChildrenWrapper maxWidth="100%" justifyContent="space-between">
            <Box minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
              <LinkEllipsis>
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

RelationDragPreview.propTypes = {
  status: PropTypes.string.isRequired,
  displayedValue: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
};
