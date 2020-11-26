import React from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded, Count } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';
import Truncate from '../Truncate';
import Truncated from '../Truncated';
import CountWrapper from './CountWrapper';

const RelationPreviewList = ({ metadatas: { mainField }, relationType, value }) => {
  const { formatMessage } = useIntl();
  const isSingle = ['oneWay', 'oneToOne', 'manyToOne'].includes(relationType);

  if (isSingle) {
    return (
      <Truncate>
        <Truncated>{value ? value[mainField] : '-'}</Truncated>
      </Truncate>
    );
  }

  const size = value ? value.length : 0;

  return (
    <Truncate>
      <Flex>
        <CountWrapper>
          <Count count={size} />
        </CountWrapper>
        <Padded left size="xs" />
        <Truncated>
          {formatMessage({
            id: getTrad(
              size > 1 ? 'containers.ListPage.items.plural' : 'containers.ListPage.items.singular'
            ),
          })}
        </Truncated>
      </Flex>
    </Truncate>
  );
};

RelationPreviewList.defaultProps = {
  value: null,
};

RelationPreviewList.propTypes = {
  metadatas: PropTypes.shape({
    mainField: PropTypes.string.isRequired,
  }).isRequired,
  relationType: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export default RelationPreviewList;
