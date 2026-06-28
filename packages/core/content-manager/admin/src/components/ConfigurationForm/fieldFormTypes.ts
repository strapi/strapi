import type { Schema } from '@strapi/types';

type EditFieldFormProps = {
  attribute?: Schema.Attribute.AnyAttribute;
  name: string;
  onClose: () => void;
};

export type { EditFieldFormProps };
