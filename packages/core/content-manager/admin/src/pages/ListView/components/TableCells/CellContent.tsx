import type { MouseEvent } from 'react';

import { Tooltip, Typography } from '@strapi/design-system';
import isEmpty from 'lodash/isEmpty';
import { Link as ReactRouterLink } from 'react-router-dom';

import { CellValue } from './CellValue';
import { SingleComponent, RepeatableComponent } from './Components';
import { MediaSingle, MediaMultiple } from './Media';
import { RelationMultiple, RelationSingle } from './Relations';

import type { ListFieldLayout } from '../../../../hooks/useDocumentLayout';
import type { Schema, Data } from '@strapi/types';
import type { To } from 'react-router-dom';

interface CellContentProps extends Omit<ListFieldLayout, 'cellFormatter'> {
  content: Schema.Attribute.Value<Schema.Attribute.AnyAttribute>;
  rowId: Data.ID;
  /**
   * When set, the cell renders its value as a navigational link to the entry.
   * Used for the primary (first scalar) column so users can open an entry in a
   * new tab via right-click / cmd+click / middle-click, while a plain click
   * still navigates within the SPA. Only passed for non-interactive cell types.
   */
  linkTo?: To;
}

const CellContent = ({ content, mainField, attribute, rowId, name, linkTo }: CellContentProps) => {
  const isIdColumn = name === 'id';

  if (!hasContent(content, mainField, attribute)) {
    return (
      <Typography
        textColor="neutral800"
        paddingLeft={attribute.type === 'relation' || attribute.type === 'component' ? '1.6rem' : 0}
        paddingRight={
          attribute.type === 'relation' || attribute.type === 'component' ? '1.6rem' : 0
        }
      >
        -
      </Typography>
    );
  }

  // Primary scalar column: render the value as a link to the entry so it gets
  // native open-in-new-tab semantics. stopPropagation prevents the row's own
  // onClick from firing a second navigation; React Router's Link still handles
  // the click (stopPropagation does not preventDefault).
  if (linkTo) {
    const link = (
      <Typography
        tag={ReactRouterLink}
        to={linkTo}
        onClick={(e: MouseEvent) => e.stopPropagation()}
        maxWidth="30rem"
        ellipsis
        textColor="neutral800"
      >
        <CellValue isIdColumn={isIdColumn} type={attribute.type} value={content} />
      </Typography>
    );

    return attribute.type === 'string' ? <Tooltip label={content}>{link}</Tooltip> : link;
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
        <Tooltip label={content}>
          <Typography maxWidth="30rem" ellipsis textColor="neutral800">
            <CellValue isIdColumn={isIdColumn} type={attribute.type} value={content} />
          </Typography>
        </Tooltip>
      );

    default:
      return (
        <Typography maxWidth="30rem" ellipsis textColor="neutral800">
          <CellValue isIdColumn={isIdColumn} type={attribute.type} value={content} />
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

export { CellContent, hasContent };
export type { CellContentProps };
