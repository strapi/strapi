import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import Component from '@strapi/icons/Component';
import CollectionType from '@strapi/icons/CollectionType';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import DynamicZone from '@strapi/icons/DynamicZone';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Json from '@strapi/icons/Json';
import LongDescription from '@strapi/icons/RichText';
import Media from '@strapi/icons/Media';
import Password from '@strapi/icons/Password';
import Relation from '@strapi/icons/Relation';
import SingleType from '@strapi/icons/SingleType';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Numbers from '@strapi/icons/Number';
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
  width: ${pxToRem(32)};
  height: ${pxToRem(24)};
  box-sizing: content-box;
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

  return <IconBox as={Compo} {...rest} aria-hidden />;
};

AttributeIcon.defaultProps = {
  customField: null,
};

AttributeIcon.propTypes = {
  type: PropTypes.string.isRequired,
  customField: PropTypes.string,
};

export default AttributeIcon;
