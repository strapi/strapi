import * as React from 'react';

import type { TrackingEvent } from './features/Tracking';
import type { Attribute, EntityService } from '@strapi/types';
import type { errors } from '@strapi/utils';
import type { MessageDescriptor, PrimitiveType } from 'react-intl';

export interface TranslationMessage extends MessageDescriptor {
  values?: Record<string, PrimitiveType>;
}

export type ApiError =
  | errors.ApplicationError
  | errors.ForbiddenError
  | errors.NotFoundError
  | errors.NotImplementedError
  | errors.PaginationError
  | errors.PayloadTooLargeError
  | errors.PolicyError
  | errors.RateLimitError
  | errors.UnauthorizedError
  | errors.ValidationError
  | errors.YupValidationError;

export type AttributeFilter = Record<
  string,
  Record<EntityService.Params.Filters.Operator.Where, string | null>
>;

export type RelationFilter = Record<string, AttributeFilter>;

export type Filter = AttributeFilter | RelationFilter;

export interface Operator {
  value: EntityService.Params.Filters.Operator.Where;
  intlLabel: MessageDescriptor;
}

export interface DefaultFilterInputsProps {
  label?: string;
  onChange: (value: string | null) => void;
  options?: FilterData['fieldSchema']['options'] | FilterData['metadatas']['options'];
  type: FilterData['fieldSchema']['type'];
  value?: string | null;
}

export interface FilterData {
  name: string;
  metadatas: {
    label: string;
    customOperators?: Array<{
      intlLabel: { id: string; defaultMessage: string };
      value: string;
    }>;
    customInput?: React.ComponentType;
    options?: Array<{ label?: string; customValue: string }>;
    uid?: string;
  };
  fieldSchema: {
    type: Attribute.Any['type'];
    options?: string[];
    mainField?: {
      name: string;
      type?: Attribute.Any['type'];
    };
  };
  trackedEvent?: TrackingEvent;
}
