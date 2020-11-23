import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import { Flex, Padded, Count } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';
import { useContentTypeLayout } from '../../hooks';
import { Truncate, Truncated } from '../CustomTable/styledComponents';
import CountWrapper from './CountWrapper';

const RelationPreviewList = ({ name, value }) => {
  const { formatMessage } = useIntl();
  const { contentType } = useContentTypeLayout();
  const mainField = get(contentType, ['metadatas', name, 'edit', 'mainField'], '');

  return Array.isArray(value) ? (
    <Truncate>
      <Flex>
        <CountWrapper>
          <Count count={value.length} />
        </CountWrapper>
        <Padded left size="xs" />
        <Truncated>
          {formatMessage({
            id: getTrad(
              value.length > 1
                ? 'containers.ListPage.items.plural'
                : 'containers.ListPage.items.singular'
            ),
          })}
        </Truncated>
      </Flex>
    </Truncate>
  ) : (
    <Truncate>
      <Truncated>{value[mainField] || '-'}</Truncated>
    </Truncate>
  );
};

RelationPreviewList.defaultProps = {
  value: null,
};

RelationPreviewList.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export default RelationPreviewList;
