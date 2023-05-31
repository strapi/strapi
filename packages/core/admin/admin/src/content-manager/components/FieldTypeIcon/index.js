import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system';
import { useCustomFields } from '@strapi/helper-plugin';
import {
  Date,
  Boolean,
  Email,
  Enumeration,
  Media,
  Relation,
  Text,
  Uid,
  Number,
  Json,
  Component,
  DynamicZone,
} from '@strapi/icons';

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
