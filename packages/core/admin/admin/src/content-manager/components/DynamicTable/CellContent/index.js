import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@strapi/parts/Text';
import { useIntl } from 'react-intl';
import toString from 'lodash/toString';
import formatDisplayedValue from './utils/formatDisplayedValue';
import Media from './Media';
import MultipleMedias from './MultipleMedias';
import Relation from './Relation';

const CellContent = ({ content, fieldSchema, metadatas, name, queryInfos, rowId }) => {
  const { formatDate, formatTime, formatNumber } = useIntl();

  if (content === null || content === undefined) {
    return <Text textColor="neutral800">-</Text>;
  }

  let formattedContent = formatDisplayedValue(content, fieldSchema.type, {
    formatDate,
    formatTime,
    formatNumber,
  });

  if (fieldSchema.type === 'media' && !fieldSchema.multiple) {
    return <Media {...content} />;
  }

  if (fieldSchema.type === 'media' && fieldSchema.multiple) {
    return <MultipleMedias {...content} />;
  }

  if (fieldSchema.type === 'relation') {
    return (
      <Relation
        fieldSchema={fieldSchema}
        queryInfos={queryInfos}
        metadatas={metadatas}
        value={content}
        name={name}
        rowId={rowId}
      />
    );
  }

  return <Text textColor="neutral800">{toString(formattedContent)}</Text>;
};

CellContent.defaultProps = {
  content: undefined,
  queryInfos: undefined,
};

CellContent.propTypes = {
  content: PropTypes.any,
  fieldSchema: PropTypes.shape({ multiple: PropTypes.bool, type: PropTypes.string.isRequired })
    .isRequired,
  metadatas: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  queryInfos: PropTypes.shape({ endPoint: PropTypes.string.isRequired }),
};

export default CellContent;
