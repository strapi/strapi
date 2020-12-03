import React, { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Flex, Padded, Count } from '@buffetjs/core';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';
import Truncate from '../Truncate';
import Truncated from '../Truncated';
import CountWrapper from './CountWrapper';
import RelationPreviewTooltip from './RelationPreviewTooltip';

const RelationPreviewList = ({
  options: {
    metadatas: { mainField },
    relationType,
    value,
    rowId,
    cellId,
    name,
  },
}) => {
  const { formatMessage } = useIntl();
  const [tooltipIsDisplayed, setDisplayTooltip] = useState(false);
  const isSingle = ['oneWay', 'oneToOne', 'manyToOne'].includes(relationType);
  const tooltipId = useMemo(() => `${rowId}-${cellId}`, [rowId, cellId]);

  if (isSingle) {
    return (
      <Truncate>
        <Truncated>{value ? value[mainField.name] : '-'}</Truncated>
      </Truncate>
    );
  }

  const size = value ? value.length : 0;

  const handleTooltipToggle = () => {
    setDisplayTooltip(prev => !prev);
  };

  return (
    <Truncate style={{ maxWidth: 'fit-content' }}>
      <Flex
        // This is useful to avoid the render of every tooltips of the list at the same time.
        // https://github.com/wwayne/react-tooltip/issues/524
        onMouseEnter={handleTooltipToggle}
        onMouseLeave={handleTooltipToggle}
        data-for={tooltipId}
        data-tip={JSON.stringify(value)}
      >
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
      {size > 0 && tooltipIsDisplayed && (
        <RelationPreviewTooltip
          name={name}
          rowId={rowId}
          tooltipId={tooltipId}
          value={value}
          mainField={mainField}
        />
      )}
    </Truncate>
  );
};

RelationPreviewList.propTypes = {
  options: PropTypes.shape({
    cellId: PropTypes.string.isRequired,
    metadatas: PropTypes.shape({
      mainField: PropTypes.object.isRequired,
    }).isRequired,
    name: PropTypes.string.isRequired,
    relationType: PropTypes.string,
    rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string,
    value: PropTypes.any,
  }).isRequired,
};

export default memo(RelationPreviewList);
