import React from 'react';

import { Box } from '@strapi/design-system';
import { pxToRem, useCustomFields } from '@strapi/helper-plugin';
import {
  Boolean,
  CollectionType,
  Component,
  Date,
  DynamicZone,
  Email,
  Enumeration,
  Json,
  Media,
  Number,
  Password,
  Relation,
  RichText,
  SingleType,
  Text,
  Uid,
  Blocks,
} from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const iconByTypes = {
  biginteger: Number,
  blocks: Blocks,
  boolean: Boolean,
  collectionType: CollectionType,
  component: Component,
  contentType: CollectionType,
  date: Date,
  datetime: Date,
  decimal: Number,
  dynamiczone: DynamicZone,
  email: Email,
  enum: Enumeration,
  enumeration: Enumeration,
  file: Media,
  files: Media,
  float: Number,
  integer: Number,
  json: Json,
  JSON: Json,
  media: Media,
  number: Number,
  password: Password,
  relation: Relation,
  richtext: RichText,
  singleType: SingleType,
  string: Text,
  text: Text,
  time: Date,
  timestamp: Date,
  uid: Uid,
};

const IconBox = styled(Box)`
  svg {
    height: 100%;
    width: 100%;
  }
`;

const AttributeIcon = ({ type, customField, ...rest }) => {
  const customFieldsRegistry = useCustomFields();

  let Compo = iconByTypes[type];

  if (customField) {
    const { icon } = customFieldsRegistry.get(customField);

    if (icon) {
      Compo = icon;
    }
  }

  if (!iconByTypes[type]) {
    return null;
  }

  return (
    <IconBox height={pxToRem(24)} width={pxToRem(32)} shrink={0} {...rest} aria-hidden>
      <Box as={Compo} />
    </IconBox>
  );
};

AttributeIcon.defaultProps = {
  customField: null,
};

AttributeIcon.propTypes = {
  type: PropTypes.string.isRequired,
  customField: PropTypes.string,
};

export default AttributeIcon;
