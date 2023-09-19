import * as React from 'react';

import type { TrackingEvent } from './features/Tracking';
import type { Attribute, EntityService } from '@strapi/strapi';
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

export type InputType =
  | 'json'
  | 'bool'
  | 'checkbox'
  | 'datetime'
  | 'date'
  | 'number'
  | 'email'
  | 'timestamp'
  | 'text'
  | 'string'
  | 'password'
  | 'select'
  | 'textarea'
  | 'time';

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

export interface DefaultFilterInputsProps<TOptions extends any[] = string[]> {
  label?: string;
  onChange: (value: string | null) => void;
  options?: TOptions;
  type: Attribute.Kind;
  value?: string | null;
}

export interface FilterData<TOptions extends any[] = string[]> {
  fieldSchema:
    | {
        options?: string[];
        type: Exclude<Attribute.Kind, 'relation'>;
      }
    | {
        type: 'relation';
        options?: string[];
        mainField: {
          name: string;
          schema: Attribute.Any;
        };
      };
  metadatas: {
    customOperators?: Operator[];
    customInput?: React.ComponentType<DefaultFilterInputsProps<TOptions>>;
    options?: TOptions;
    label: string;
  };
  name: string;
  trackedEvent?: TrackingEvent;
}
