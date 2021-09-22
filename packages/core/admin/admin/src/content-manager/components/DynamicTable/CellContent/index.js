import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Text } from '@strapi/parts/Text';
import Media from './Media';
import MultipleMedias from './MultipleMedias';
import Relation from './Relation';
import CellValue from './CellValue';

const TextMaxWidth = styled(Text)`
  max-width: 300px;
`;

const CellContent = ({ content, fieldSchema, metadatas, name, queryInfos, rowId }) => {
  if (content === null || content === undefined) {
    return <Text textColor="neutral800">-</Text>;
  }

  if (fieldSchema.type === 'media' && !fieldSchema.multiple) {
    return <Media {...content} />;
  }

  if (fieldSchema.type === 'media' && fieldSchema.multiple) {
    return <MultipleMedias value={content} />;
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

  return (
    <TextMaxWidth ellipsis textColor="neutral800">
      <CellValue type={fieldSchema.type} value={content} />
    </TextMaxWidth>
  );
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
