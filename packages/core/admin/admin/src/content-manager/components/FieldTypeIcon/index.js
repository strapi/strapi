import React from 'react';
import PropTypes from 'prop-types';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Media from '@strapi/icons/Media';
import Relation from '@strapi/icons/Relation';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Number from '@strapi/icons/Number';
import Json from '@strapi/icons/Json';
import Component from '@strapi/icons/Component';
import DynamicZone from '@strapi/icons/DynamicZone';

const iconByTypes = {
  biginteger: <Number />,
  boolean: <Boolean />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Number />,
  email: <Email />,
  enum: <Enumeration />,
  enumeration: <Enumeration />,
  file: <Media />,
  files: <Media />,
  float: <Number />,
  integer: <Number />,
  media: <Media />,
  number: <Number />,
  relation: <Relation />,
  string: <Text />,
  text: <Text />,
  richtext: <Text />,
  time: <Date />,
  timestamp: <Date />,
  json: <Json />,
  uid: <Uid />,
  component: <Component />,
  dynamiczone: <DynamicZone />,
};

const FieldTypeIcon = ({ type }) => iconByTypes[type] || null;

FieldTypeIcon.propTypes = {
  type: PropTypes.string.isRequired,
};

export default FieldTypeIcon;
