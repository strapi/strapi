import { Tooltip, Typography } from '@strapi/design-system';
import isEmpty from 'lodash/isEmpty';
import styled from 'styled-components';

import { isFieldTypeNumber } from '../../../../utils/fields';

import { CellValue } from './CellValue';
import { SingleComponent, RepeatableComponent } from './Components';
import { MediaSingle, MediaMultiple } from './Media';
import { RelationSingle, RelationMultiple } from './Relations';

import type { FormattedContentTypeLayout } from '../../../../utils/layouts';
import type { TableHeader } from '../../ListViewPage';
import type { Attribute, Entity } from '@strapi/types';

interface CellContentProps extends Omit<TableHeader, 'key'> {
  content: Attribute.GetValue<Attribute.Any>;
  rowId: Entity.ID;
  contentType: FormattedContentTypeLayout;
}

const CellContent = ({
  content,
  fieldSchema,
  metadatas,
  name,
  rowId,
  contentType,
}: CellContentProps) => {
  if (!hasContent(content, metadatas, fieldSchema)) {
    return <Typography textColor="neutral800">-</Typography>;
  }

  switch (fieldSchema.type) {
    case 'media':
      if (!fieldSchema.multiple) {
        return <MediaSingle {...content} />;
      }

      return <MediaMultiple content={content} />;

    case 'relation': {
      if (isSingleRelation(fieldSchema.relation)) {
        return <RelationSingle metadatas={metadatas} content={content} />;
      }

      return (
        <RelationMultiple
          metadatas={metadatas}
          content={content}
          name={name}
          entityId={rowId}
          uid={contentType.uid}
        />
      );
    }

    case 'component':
      if (fieldSchema.repeatable === true) {
        return <RepeatableComponent content={content} metadatas={metadatas} />;
      }

      return <SingleComponent content={content} metadatas={metadatas} />;

    case 'string':
      return (
        <Tooltip description={content}>
          <TypographyMaxWidth ellipsis textColor="neutral800">
            <CellValue type={fieldSchema.type} value={content} />
          </TypographyMaxWidth>
        </Tooltip>
      );

    default:
      return (
        <TypographyMaxWidth ellipsis textColor="neutral800">
          <CellValue type={fieldSchema.type} value={content} />
        </TypographyMaxWidth>
      );
  }
};

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

const hasContent = (
  content: CellContentProps['content'],
  metadatas: CellContentProps['metadatas'],
  fieldSchema: CellContentProps['fieldSchema']
) => {
  if (fieldSchema.type === 'component') {
    const { mainField } = metadatas;

    // Repeatable fields show the ID as fallback, in case the mainField
    // doesn't have any content
    if (fieldSchema?.repeatable || !mainField) {
      return content && Array.isArray(content) && content.length > 0;
    }

    const value = content?.[mainField.name];

    // relations, media ... show the id as fallback
    if (mainField.name === 'id' && ![undefined, null].includes(value)) {
      return true;
    }

    /* The ID field reports itself as type `integer`, which makes it
       impossible to distinguish it from other number fields.

       Biginteger fields need to be treated as strings, as `isNumber`
       doesn't deal with them.
    */
    if (
      isFieldTypeNumber(mainField.type) &&
      mainField.type !== 'biginteger' &&
      mainField.name !== 'id'
    ) {
      return typeof value === 'number';
    }

    return !isEmpty(value);
  }

  if (fieldSchema.type === 'relation') {
    if (isSingleRelation(fieldSchema.relation)) {
      return !isEmpty(content);
    }

    return content?.count > 0;
  }

  /*
      Biginteger fields need to be treated as strings, as `isNumber`
      doesn't deal with them.
  */
  if (isFieldTypeNumber(fieldSchema.type) && fieldSchema.type !== 'biginteger') {
    return typeof content === 'number';
  }

  if (fieldSchema.type === 'boolean') {
    return content !== null;
  }

  return !isEmpty(content);
};

const isSingleRelation = (
  type: Extract<CellContentProps['fieldSchema'], { type: 'relation' }>['relation']
) => ['oneToOne', 'manyToOne', 'oneToOneMorph'].includes(type);

export { CellContent };
export type { CellContentProps };
