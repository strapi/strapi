import React, { memo } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { pxToRem } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import has from 'lodash/has';
import isEmpty from 'lodash/isEmpty';
import { IconButton } from '@strapi/parts/IconButton';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Text } from '@strapi/parts/Text';
import { Link } from '@strapi/parts/Link';
import BaseMinus from '@strapi/icons/Minus';
import { getTrad } from '../../utils';

const Minus = styled(IconButton)`
  padding: 0;
  border: 0;
  width: 20px;
  height: 20px;
  svg {
    width: 20px;
    height: 20px;
  }
`;
const StyledBullet = styled.div`
  width: ${pxToRem(6)};
  height: ${pxToRem(6)};
  margin-right: ${({ theme }) => theme.spaces[2]};
  background: ${({ theme, isDraft }) => theme.colors[isDraft ? 'secondary700' : 'success200']};
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
    <Row as="li" alignItems="center">
      <Row style={{ flex: 1 }} alignItems="center">
        {hasDraftAndPublish && (
          <Box paddingLeft={1} paddingRight={2}>
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
          <Text small>{value || data.id}</Text>
        )}
      </Row>
      <Minus onClick={onRemove} icon={<BaseMinus />} label="Remove" style={{ cursor }} />
    </Row>
  );
}

ListItem.defaultProps = {
  onRemove: () => {},
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
