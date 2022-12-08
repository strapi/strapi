import * as React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Box, Flex, IconButton, Typography, Status, Icon } from '@strapi/design-system';
import { Drag, Cross } from '@strapi/icons';

import { getTrad } from '../../utils';
import { PUBLICATION_STATES } from '../RelationInputDataManager/constants';
import { ChildrenWrapper, StackWrapper } from '../RelationInput/components/RelationItem';
import { BoxEllipsis, DisconnectButton } from '../RelationInput/RelationInput';

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
        <StackWrapper spacing={1} horizontal>
          <IconButton noBorder>
            <Drag />
          </IconButton>
          <ChildrenWrapper justifyContent="space-between">
            <BoxEllipsis minWidth={0} paddingTop={1} paddingBottom={1} paddingRight={4}>
              <Typography textColor="primary600" ellipsis>
                {displayedValue}
              </Typography>
            </BoxEllipsis>
            {status && (
              <Status variant={statusColor} showBullet={false} size="S">
                <Typography fontWeight="bold" textColor={`${statusColor}700`}>
                  {stateMessage[status]}
                </Typography>
              </Status>
            )}
          </ChildrenWrapper>
        </StackWrapper>
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
