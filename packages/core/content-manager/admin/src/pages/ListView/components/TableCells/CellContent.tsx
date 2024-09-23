import { Tooltip, Typography } from '@strapi/design-system';
import isEmpty from 'lodash/isEmpty';

import { CellValue } from './CellValue';
import { SingleComponent, RepeatableComponent } from './Components';
import { MediaSingle, MediaMultiple } from './Media';
import { RelationMultiple, RelationSingle } from './Relations';

import type { ListFieldLayout } from '../../../../hooks/useDocumentLayout';
import type { Schema, Data } from '@strapi/types';

interface CellContentProps extends Omit<ListFieldLayout, 'cellFormatter'> {
  content: Schema.Attribute.Value<Schema.Attribute.AnyAttribute>;
  rowId: Data.ID;
}

const CellContent = ({ content, mainField, attribute, rowId, name }: CellContentProps) => {
  if (!hasContent(content, mainField, attribute)) {
    return (
      <Typography
        textColor="neutral800"
        paddingLeft={attribute.type === ('relation' || 'component') ? '1.6rem' : 0}
        paddingRight={attribute.type === ('relation' || 'component') ? '1.6rem' : 0}
      >
        -
      </Typography>
    );
  }

  switch (attribute.type) {
    case 'media':
      if (!attribute.multiple) {
        return <MediaSingle {...content} />;
      }

      return <MediaMultiple content={content} />;

    case 'relation': {
      if (isSingleRelation(attribute.relation)) {
        return <RelationSingle mainField={mainField} content={content} />;
      }

      return <RelationMultiple rowId={rowId} mainField={mainField} content={content} name={name} />;
    }

    case 'component':
      if (attribute.repeatable) {
        return <RepeatableComponent mainField={mainField} content={content} />;
      }

      return <SingleComponent mainField={mainField} content={content} />;

    case 'string':
      return (
        <Tooltip description={content}>
          <Typography maxWidth="30rem" ellipsis textColor="neutral800">
            <CellValue type={attribute.type} value={content} />
          </Typography>
        </Tooltip>
      );

    default:
      return (
        <Typography maxWidth="30rem" ellipsis textColor="neutral800">
          <CellValue type={attribute.type} value={content} />
        </Typography>
      );
  }
};

const hasContent = (
  content: CellContentProps['content'],
  mainField: CellContentProps['mainField'],
  attribute: CellContentProps['attribute']
) => {
  if (attribute.type === 'component') {
    // Repeatable fields show the ID as fallback, in case the mainField
    // doesn't have any content
    if (attribute.repeatable || !mainField) {
      return content?.length > 0;
    }

    const value = content?.[mainField.name];

    // relations, media ... show the id as fallback
    if (mainField.name === 'id' && ![undefined, null].includes(value)) {
      return true;
    }

    return !isEmpty(value);
  }

  if (attribute.type === 'relation') {
    if (isSingleRelation(attribute.relation)) {
      return !isEmpty(content);
    }

    if (Array.isArray(content)) {
      return content.length > 0;
    }

    return content?.count > 0;
  }

  /*
      Biginteger fields need to be treated as strings, as `isNumber`
      doesn't deal with them.
  */
  if (['integer', 'decimal', 'float', 'number'].includes(attribute.type)) {
    return typeof content === 'number';
  }

  if (attribute.type === 'boolean') {
    return content !== null;
  }

  return !isEmpty(content);
};

const isSingleRelation = (
  type: Extract<CellContentProps['attribute'], { type: 'relation' }>['relation']
) => ['oneToOne', 'manyToOne', 'oneToOneMorph'].includes(type);

export { CellContent };
export type { CellContentProps };
