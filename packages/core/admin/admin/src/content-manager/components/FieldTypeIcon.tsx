import * as React from 'react';

import { Box } from '@strapi/design-system';
import { useCustomFields } from '@strapi/helper-plugin';
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

import type { Attribute } from '@strapi/types';

const iconByTypes: Record<Attribute.Kind, React.ReactElement> = {
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
  const customFieldsRegistry = useCustomFields();

  if (!type) {
    return null;
  }

  let Compo = iconByTypes[type];

  if (customFieldUid) {
    const customField = customFieldsRegistry.get(customFieldUid);
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
