import * as React from 'react';

import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Box } from '@strapi/design-system';
import {
  BlocksField,
  BooleanField,
  ComponentField,
  DateField,
  DynamicZoneField,
  EmailField,
  EnumerationField,
  JsonField,
  MediaField,
  NumberField,
  PasswordField,
  RelationField,
  TextField,
  UidField,
} from '@strapi/icons/symbols';

import type { Schema } from '@strapi/types';

const iconByTypes: Record<Schema.Attribute.Kind, React.ReactElement> = {
  biginteger: <NumberField />,
  boolean: <BooleanField />,
  date: <DateField />,
  datetime: <DateField />,
  decimal: <NumberField />,
  email: <EmailField />,
  enumeration: <EnumerationField />,
  float: <NumberField />,
  integer: <NumberField />,
  media: <MediaField />,
  password: <PasswordField />,
  relation: <RelationField />,
  string: <TextField />,
  text: <TextField />,
  richtext: <TextField />,
  time: <DateField />,
  timestamp: <DateField />,
  json: <JsonField />,
  uid: <UidField />,
  component: <ComponentField />,
  dynamiczone: <DynamicZoneField />,
  blocks: <BlocksField />,
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
