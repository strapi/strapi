import * as React from 'react';

import {
  Field,
  Flex,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { isParamNeeded } from '../../../../../../shared/conditions/params';
import { getTranslation } from '../../../../utils/getTranslation';

import type { FieldAccepts } from '../../../../../../shared/builder/types';
import type {
  ConditionRef,
  DataAction,
  LayoutCondition,
  LayoutConditionParam,
  LayoutContentType,
  LayoutField,
} from '../../../../../../shared/contracts/permissions';

/** What a param holds: a choice of attribute, a boolean, a text or a number */
type ParamValue = unknown;

const TEXT_TYPES = ['string', 'text', 'email', 'uid', 'enumeration', 'richtext', 'password'];
const NUMBER_TYPES = ['integer', 'biginteger', 'float', 'decimal'];
const DATE_TYPES = ['date', 'datetime', 'time', 'timestamp'];

const flatten = (fields: LayoutField[]): LayoutField[] =>
  fields.flatMap((field) => [field, ...flatten(field.children ?? [])]);

const fieldAccepts = (field: LayoutField, accepts: FieldAccepts) => {
  if (typeof accepts === 'object') {
    return field.type === 'relation' && field.relationTarget === accepts.relation;
  }

  const types = { text: TEXT_TYPES, number: NUMBER_TYPES, date: DATE_TYPES, boolean: ['boolean'] };

  return types[accepts].includes(field.type);
};

interface Candidate {
  value: string;
  label: string;
}

/**
 * What a field param can be set to: the type's attributes its `accepts` allows, or the options the
 * definition lists when it names no kind of field
 */
const getCandidates = (
  param: LayoutConditionParam,
  contentType: Pick<LayoutContentType, 'fields'>
): Candidate[] => {
  if (param.accepts !== undefined) {
    const accepts = param.accepts;

    return flatten(contentType.fields)
      .filter((field) => fieldAccepts(field, accepts))
      .map((field) => ({ value: field.name, label: field.label }));
  }

  return (param.options ?? []).map((option) => ({ value: option, label: option }));
};

/** The params a row shows: those that only matter when an entry is created show on Create alone */
const getVisibleParams = (condition: LayoutCondition, action: DataAction) =>
  condition.params.filter((param) => param.createOnly !== true || action === 'create');

/** What a condition is set up with when it is chosen: the params that have a value to start from */
const initialParam = (
  param: LayoutConditionParam,
  candidates: Candidate[]
): ParamValue | undefined => {
  if (param.type === 'attribute') {
    // One choice is no choice: the field is stored all the same, so a second relation to the user
    // added later never changes what the role does
    if (candidates.length === 1) {
      return candidates[0].value;
    }

    return typeof param.default === 'string' &&
      candidates.some(({ value }) => value === param.default)
      ? param.default
      : undefined;
  }

  if (param.type === 'boolean') {
    return typeof param.default === 'boolean' ? param.default : param.required ? false : undefined;
  }

  return param.default;
};

const toConditionRef = (
  condition: LayoutCondition,
  action: DataAction,
  contentType: Pick<LayoutContentType, 'fields'>
): ConditionRef => {
  const params = Object.fromEntries(
    getVisibleParams(condition, action).flatMap((param) => {
      const value = initialParam(param, getCandidates(param, contentType));

      return value === undefined ? [] : [[param.name, value]];
    })
  );

  return Object.keys(params).length > 0
    ? { name: condition.name, params }
    : { name: condition.name };
};

/** A param the admin has to fill in: the role cannot be saved while it is empty */
const isNeeded = (param: LayoutConditionParam, candidates: Candidate[]) =>
  param.type !== 'boolean' &&
  isParamNeeded(
    {
      type: param.type,
      required: param.required,
      relationTarget: typeof param.accepts === 'object' ? param.accepts.relation : undefined,
    },
    candidates.length
  );

const isMissing = (
  param: LayoutConditionParam,
  ref: ConditionRef,
  contentType: Pick<LayoutContentType, 'fields'>
) => {
  const candidates = getCandidates(param, contentType);

  if (!isNeeded(param, candidates)) {
    return false;
  }

  const value = ref.params?.[param.name] ?? param.default;

  return value === undefined || value === null || value === '';
};

const humanize = (name: string) => {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

/* -------------------------------------------------------------------------------------------------
 * ParamInput
 * -----------------------------------------------------------------------------------------------*/

interface ParamInputProps {
  param: LayoutConditionParam;
  contentType: Pick<LayoutContentType, 'fields'>;
  value: ParamValue;
  onChange: (value: ParamValue) => void;
}

/** The control of one param of a condition: a choice of field, a toggle or an input */
const ParamInput = ({ param, contentType, value, onChange }: ParamInputProps) => {
  const { formatMessage } = useIntl();
  const label = humanize(param.name);
  const candidates = getCandidates(param, contentType);
  const required = isNeeded(param, candidates);

  if (param.type === 'boolean') {
    return (
      <Field.Root>
        <Field.Label>{label}</Field.Label>
        <Toggle
          checked={Boolean(value)}
          onLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.on-label',
            defaultMessage: 'True',
          })}
          offLabel={formatMessage({
            id: 'app.components.ToggleCheckbox.off-label',
            defaultMessage: 'False',
          })}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
        />
      </Field.Root>
    );
  }

  if (param.type === 'attribute') {
    // Stored all the same, but nothing to ask for
    if (candidates.length === 1) {
      return null;
    }

    return (
      <Field.Root required={required}>
        <Field.Label>{label}</Field.Label>
        <SingleSelect
          value={typeof value === 'string' ? value : ''}
          placeholder={formatMessage({
            id: getTranslation('roles.settings.param.choose'),
            defaultMessage: 'Choose a field',
          })}
          onChange={(next) => onChange(next === '' ? undefined : String(next))}
        >
          {candidates.map((candidate) => (
            <SingleSelectOption key={candidate.value} value={candidate.value}>
              {candidate.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
    );
  }

  if (param.type === 'number') {
    return (
      <Field.Root required={required}>
        <Field.Label>{label}</Field.Label>
        <NumberInput
          value={typeof value === 'number' ? value : undefined}
          onValueChange={onChange}
        />
      </Field.Root>
    );
  }

  return (
    <Field.Root required={required}>
      <Field.Label>{label}</Field.Label>
      <TextInput
        value={typeof value === 'string' ? value : ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value === '' ? undefined : event.target.value)
        }
      />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ConditionInputs
 * -----------------------------------------------------------------------------------------------*/

interface ConditionInputsProps {
  action: DataAction;
  contentType: Pick<LayoutContentType, 'fields'>;
  /** The chosen conditions the layout offers, with what each holds */
  conditions: Array<{ condition: LayoutCondition; ref: ConditionRef }>;
  onChange: (name: string, param: string, value: ParamValue) => void;
}

/** Under a row: one line for each chosen condition that has inputs to show on this action */
const ConditionInputs = ({ action, contentType, conditions, onChange }: ConditionInputsProps) => (
  <>
    {conditions.map(({ condition, ref }) => {
      const params = getVisibleParams(condition, action);

      if (params.length === 0) {
        return null;
      }

      return (
        <Flex
          key={condition.name}
          direction="column"
          alignItems="stretch"
          gap={2}
          paddingTop={2}
          paddingLeft={6}
          paddingRight={6}
        >
          <Typography variant="pi" fontWeight="bold" textColor="neutral600">
            {condition.displayName}
          </Typography>
          <Flex gap={4} alignItems="flex-start" wrap="wrap">
            {params.map((param) => (
              <ParamInput
                key={param.name}
                param={param}
                contentType={contentType}
                value={ref.params?.[param.name]}
                onChange={(next) => onChange(condition.name, param.name, next)}
              />
            ))}
          </Flex>
        </Flex>
      );
    })}
  </>
);

export { ConditionInputs, getCandidates, isMissing, toConditionRef };
export type { ConditionInputsProps, ParamValue };
