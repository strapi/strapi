import React, { memo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { pxToRem, RemoveRoundedButton, Link } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { getTrad } from '../../utils';

const StyledBullet = styled.div`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  background: ${({ theme, isDraft }) => theme.colors[isDraft ? 'secondary600' : 'success600']};
  border-radius: 50%;
  cursor: pointer;
`;

function ListItem({
  data,
  displayNavigationLink,
  isDisabled,
  mainField,
  onRemove,
  searchToPersist,
  targetModel,
}) {
  const { formatMessage } = useIntl();
  const to = `/content-manager/collectionType/${targetModel}/${data.id}`;
  let cursor = 'pointer';

  if (isDisabled) {
    cursor = 'not-allowed';
  }

  if (!displayNavigationLink) {
    cursor = 'default';
  }

  const hasDraftAndPublish = has(data, 'publishedAt');
  const isDraft = isEmpty(data.publishedAt);
  const value = data[mainField.name];
  const draftMessage = {
    id: getTrad('components.Select.draft-info-title'),
    defaultMessage: 'State: Draft',
  };
  const publishedMessage = {
    id: getTrad('components.Select.publish-info-title'),
    defaultMessage: 'State: Published',
  };
  const title = isDraft ? formatMessage(draftMessage) : formatMessage(publishedMessage);
  const { pathname } = useLocation();

  return (
    <Flex as="li" alignItems="center">
      <Flex style={{ flex: 1 }} alignItems="center">
        {hasDraftAndPublish && (
          <Box paddingRight={2}>
            <StyledBullet isDraft={isDraft} title={title} />
          </Box>
        )}
        {displayNavigationLink ? (
          <Link
            to={{ pathname: to, state: { from: pathname }, search: searchToPersist }}
            style={{ textTransform: 'none' }}
          >
            {value || data.id}
          </Link>
        ) : (
          <Typography variant="pi">{value || data.id}</Typography>
        )}
      </Flex>
      <RemoveRoundedButton onClick={onRemove} label="Remove" style={{ cursor }} />
    </Flex>
  );
}

ListItem.defaultProps = {
  onRemove() {},
  searchToPersist: null,
  targetModel: '',
};

ListItem.propTypes = {
  data: PropTypes.object.isRequired,
  displayNavigationLink: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  onRemove: PropTypes.func,
  searchToPersist: PropTypes.string,
  targetModel: PropTypes.string,
};

export default memo(ListItem);
