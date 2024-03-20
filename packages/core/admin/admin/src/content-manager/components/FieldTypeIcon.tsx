import * as React from 'react';

import { Box } from '@strapi/design-system';
import {
  Blocks,
  Boolean,
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
  Text,
  Uid,
} from '@strapi/icons';

import { useStrapiApp } from '../../features/StrapiApp';

import type { Schema } from '@strapi/types';

const iconByTypes: Record<Schema.Attribute.Kind, React.ReactElement> = {
  biginteger: <Number />,
  boolean: <Boolean />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Number />,
  email: <Email />,
  enumeration: <Enumeration />,
  float: <Number />,
  integer: <Number />,
  media: <Media />,
  password: <Password />,
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
  blocks: <Blocks />,
};

interface FieldTypeIconProps {
  type?: keyof typeof iconByTypes;
  customFieldUid?: string;
}

const FieldTypeIcon = ({ type, customFieldUid }: FieldTypeIconProps) => {
  const getCustomField = useStrapiApp('FieldTypeIcon', (state) => state.customFields.get);

  if (!type) {
    return null;
  }

  let Compo = iconByTypes[type];

  if (customFieldUid) {
    const customField = getCustomField(customFieldUid);
    const CustomFieldIcon = customField?.icon;

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

export { FieldTypeIcon };
