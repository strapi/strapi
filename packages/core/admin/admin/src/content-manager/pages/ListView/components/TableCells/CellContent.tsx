import { Tooltip, Typography } from '@strapi/design-system';
import isEmpty from 'lodash/isEmpty';
import styled from 'styled-components';

import { useDoc } from '../../../../hooks/useDocument';

import { CellValue } from './CellValue';
import { SingleComponent, RepeatableComponent } from './Components';
import { MediaSingle, MediaMultiple } from './Media';

import type { ListFieldLayout } from '../../../../hooks/useDocumentLayout';
import type { Schema, Data } from '@strapi/types';

interface CellContentProps extends Omit<ListFieldLayout, 'cellFormatter'> {
  content: Schema.Attribute.Value<Schema.Attribute.AnyAttribute>;
  rowId: Data.ID;
}

const CellContent = ({ content, mainField, attribute }: CellContentProps) => {
  const { components } = useDoc();

  if (!hasContent(content, mainField, attribute)) {
    return <Typography textColor="neutral800">-</Typography>;
  }

  switch (attribute.type) {
    case 'media':
      if (!attribute.multiple) {
        return <MediaSingle {...content} />;
      }

      return <MediaMultiple content={content} />;

    /**
     * TODO: re-add relations to the ListView – tracking issue https://strapi-inc.atlassian.net/browse/CONTENT-2184
     */
    // case 'relation': {
    //   if (isSingleRelation(attribute.relation)) {
    //     return <RelationSingle mainField={mainField} content={content} />;
    //   }

    //   return (
    //     <RelationMultiple mainField={mainField} content={content} name={name} entityId={rowId} />
    //   );
    // }

    case 'component':
      if (attribute.repeatable) {
        return (
          <RepeatableComponent
            schema={components[attribute.component]}
            mainField={mainField}
            content={content}
          />
        );
      }

      return (
        <SingleComponent
          schema={components[attribute.component]}
          mainField={mainField}
          content={content}
        />
      );

    case 'string':
      return (
        <Tooltip description={content}>
          <TypographyMaxWidth ellipsis textColor="neutral800">
            <CellValue type={attribute.type} value={content} />
          </TypographyMaxWidth>
        </Tooltip>
      );

    default:
      return (
        <TypographyMaxWidth ellipsis textColor="neutral800">
          <CellValue type={attribute.type} value={content} />
        </TypographyMaxWidth>
      );
  }
};

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

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

    const value = content?.[mainField];

    // relations, media ... show the id as fallback
    if (mainField === 'id' && ![undefined, null].includes(value)) {
      return true;
    }

    /* The ID field reports itself as type `integer`, which makes it
       impossible to distinguish it from other number fields.

       Biginteger fields need to be treated as strings, as `isNumber`
       doesn't deal with them.
    */
    // if (
    //   isFieldTypeNumber(mainField.type) &&
    //   mainField.type !== 'biginteger' &&
    //   mainField.name !== 'id'
    // ) {
    //   return typeof value === 'number';
    // }

    return !isEmpty(value);
  }

  if (attribute.type === 'relation') {
    if (isSingleRelation(attribute.relation)) {
      return !isEmpty(content);
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
