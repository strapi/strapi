import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import Component from '@strapi/icons/Component';
import CT from '@strapi/icons/Ct';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import DynamicZone from '@strapi/icons/DynamicZone';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Json from '@strapi/icons/Json';
import LongDescription from '@strapi/icons/LongDescription';
import Media from '@strapi/icons/Media';
import Password from '@strapi/icons/Password';
import Relation from '@strapi/icons/Relation';
import St from '@strapi/icons/St';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Numbers from '@strapi/icons/Numbers';
import { pxToRem } from '@strapi/helper-plugin';

const iconByTypes = {
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

const IconBox = styled(Box)`
  width: ${pxToRem(32)};
  height: ${pxToRem(24)};
  box-sizing: content-box;
`;

const AttributeIcon = ({ type, ...rest }) => {
  const Compo = iconByTypes[type];

  if (!iconByTypes[type]) {
    return null;
  }

  return <IconBox as={Compo} {...rest} />;
};

AttributeIcon.propTypes = {
  type: PropTypes.string.isRequired,
};

export default AttributeIcon;
