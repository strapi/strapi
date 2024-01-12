import { Box } from '@strapi/design-system';
import { useCustomFields } from '@strapi/helper-plugin';
import {
  Boolean,
  Component,
  Date,
  DynamicZone,
  Email,
  Enumeration,
  Json,
  Media,
  Number,
  Relation,
  Text,
  Uid,
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

interface FieldTypeIconProps {
  type: keyof typeof iconByTypes;
  customFieldUid?: string;
}

const FieldTypeIcon = ({ type, customFieldUid }: FieldTypeIconProps) => {
  const customFieldsRegistry = useCustomFields();

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
