import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system';
import {
  Component,
  CollectionType,
  Date,
  Boolean,
  DynamicZone,
  Email,
  Enumeration,
  Json,
  LongDescription,
  Media,
  Password,
  Relation,
  SingleType,
  Text,
  Uid,
  Numbers,
} from '@strapi/icons';
import { pxToRem, useCustomFields } from '@strapi/helper-plugin';

const iconByTypes = {
  biginteger: Numbers,
  boolean: Boolean,
  collectionType: CollectionType,
  component: Component,
  contentType: CollectionType,
  date: Date,
  datetime: Date,
  decimal: Numbers,
  dynamiczone: DynamicZone,
  email: Email,
  enum: Enumeration,
  enumeration: Enumeration,
  file: Media,
  files: Media,
  float: Numbers,
  integer: Numbers,
  json: Json,
  JSON: Json,
  media: Media,
  number: Numbers,
  password: Password,
  relation: Relation,
  richtext: LongDescription,
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
