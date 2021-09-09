import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts';
import {
  Component,
  CT,
  Date,
  Boolean,
  DynamicZone,
  Email,
  Enumeration,
  Json,
  LongDescription,
  Media,
  Numbers,
  Password,
  Relation,
  St,
  Text,
  Uid,
} from '@strapi/icons';
import { pxToRem } from '@strapi/helper-plugin';

const types = {
  biginteger: Numbers,
  boolean: Boolean,
  component: Component,
  contentType: CT,
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
  singleType: St,
  string: Text,
  text: Text,
  time: Date,
  timestamp: Date,
  uid: Uid,
};

const StyledCompo = styled(Box)`
  width: ${pxToRem(32)};
  height: ${pxToRem(24)};
  box-sizing: content-box;
`;

const AttributeIcon = ({ type, ...rest }) => {
  const Compo = types[type];

  if (!types[type]) {
    return null;
  }

  return <StyledCompo as={Compo} {...rest} />;
};

AttributeIcon.propTypes = {
  type: PropTypes.string.isRequired,
};

export default AttributeIcon;
