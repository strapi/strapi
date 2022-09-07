import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Typography } from '@strapi/design-system/Typography';
import Media from './Media';
import MultipleMedias from './MultipleMedias';
import RelationMultiple from './RelationMultiple';
import RelationSingle from './RelationSingle';
import RepeatableComponent from './RepeatableComponent';
import SingleComponent from './SingleComponent';
import CellValue from './CellValue';
import hasContent from './utils/hasContent';
import isSingleRelation from './utils/isSingleRelation';

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

const CellContent = ({ content, fieldSchema, metadatas, name, rowId, contentType }) => {
  const { type } = fieldSchema;

  if (!hasContent(type, content, metadatas, fieldSchema)) {
    return <Typography textColor="neutral800">-</Typography>;
  }

  switch (type) {
    case 'media':
      if (!fieldSchema.multiple) {
        return <Media {...content} />;
      }

      return <MultipleMedias value={content} />;

    case 'relation': {
      if (isSingleRelation(fieldSchema.relation)) {
        return <RelationSingle metadatas={metadatas} value={content} />;
      }

      return (
        <RelationMultiple
          fieldSchema={fieldSchema}
          metadatas={metadatas}
          value={content}
          name={name}
          entityId={rowId}
          contentType={contentType}
        />
      );
    }

    case 'component':
      if (fieldSchema.repeatable === true) {
        return <RepeatableComponent value={content} metadatas={metadatas} />;
      }

      return <SingleComponent value={content} metadatas={metadatas} />;

    default:
      return (
        <TypographyMaxWidth ellipsis textColor="neutral800">
          <CellValue type={type} value={content} />
        </TypographyMaxWidth>
      );
  }
};

CellContent.defaultProps = {
  content: undefined,
};

CellContent.propTypes = {
  content: PropTypes.any,
  contentType: PropTypes.shape({
    uid: PropTypes.string.isRequired,
  }).isRequired,
  fieldSchema: PropTypes.shape({
    component: PropTypes.string,
    multiple: PropTypes.bool,
    type: PropTypes.string.isRequired,
    repeatable: PropTypes.bool,
    relation: PropTypes.string,
  }).isRequired,
  metadatas: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  rowId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default CellContent;
