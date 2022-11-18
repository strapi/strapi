import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system';
import { useCustomFields } from '@strapi/helper-plugin';
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

const FieldTypeIcon = ({ type, customFieldUid }) => {
  const customFieldsRegistry = useCustomFields();

  let Compo = iconByTypes[type];

  if (customFieldUid) {
    const customField = customFieldsRegistry.get(customFieldUid);
    const CustomFieldIcon = customField.icon;

    if (CustomFieldIcon) {
      Compo = (
        <Box marginRight={3} width={7} height={6}>
          <CustomFieldIcon />
        </Box>
      );
    }
  }

  if (!iconByTypes[type]) {
    return null;
  }

  return Compo;
};

FieldTypeIcon.defaultProps = {
  customFieldUid: null,
};

FieldTypeIcon.propTypes = {
  type: PropTypes.string.isRequired,
  customFieldUid: PropTypes.string,
};

export default FieldTypeIcon;
