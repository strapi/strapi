import React from 'react';
import PropTypes from 'prop-types';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Picture from '@strapi/icons/Picture';
import Relation from '@strapi/icons/Relation';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Number from '@strapi/icons/Number';
import Json from '@strapi/icons/Json';
import Component from '@strapi/icons/Component';
import DynamicZone from '@strapi/icons/DynamicZone';

// Create a file
const iconByTypes = {
  biginteger: <Number />,
  boolean: <Boolean />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Number />,
  email: <Email />,
  enum: <Enumeration />,
  enumeration: <Enumeration />,
  file: <Picture />,
  files: <Picture />,
  float: <Number />,
  integer: <Number />,
  media: <Picture />,
  number: <Number />,
  relation: <Relation />,
  string: <Text />,
  text: <Text />,
  time: <Date />,
  timestamp: <Date />,
  json: <Json />,
  uid: <Uid />,
  component: <Component />,
  dynamiczone: <DynamicZone />,
};

const FieldTypeIcon = ({ type }) => iconByTypes[type];

FieldTypeIcon.propTypes = {
  type: PropTypes.string.isRequired,
};

export default FieldTypeIcon;
