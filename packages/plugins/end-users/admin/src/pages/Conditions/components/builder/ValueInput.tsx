import * as React from 'react';

import {
  DatePicker,
  DateTimePicker,
  Flex,
  MultiSelect,
  MultiSelectOption,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import {
  PATTERN_OPERATORS,
  takesList,
  takesNoValue,
} from '../../../../../../shared/builder/operators';
import {
  emptyValue,
  inputValueOptions,
  profileValueOptions,
  userValueOptions,
  valueTypeFor,
} from '../../utils/builderOptions';

import { useLabels } from './labels';

import type { Word } from './labels';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';
import type { FormFixed, FormInput, FormValue } from '../../utils/builderForm';
import type { ValueSlot } from '../../utils/builderOptions';

type Kind = FormValue['kind'];

const pad = (number: number) => String(number).padStart(2, '0');

const dateOf = (text: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};

const dateTimeOf = (text: string): Date | undefined => {
  const date = new Date(text);

  return text === '' || Number.isNaN(date.getTime()) ? undefined : date;
};

const parseList = (text: string) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item !== '');

/** Comma-separated values the person is still typing: the text is theirs until it is parsed into a list */
const ListText = ({
  label,
  items,
  disabled,
  onItems,
}: {
  label: string;
  items: string[];
  disabled?: boolean;
  onItems: (items: string[]) => void;
}) => {
  const { formatMessage } = useIntl();
  const [typed, setTyped] = React.useState(items.join(', '));
  // The text the person is typing stands while it reads as the list; a reset of the list shows the reset
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  const text = same(parseList(typed), items) ? typed : items.join(', ');

  return (
    <TextInput
      aria-label={label}
      disabled={disabled}
      value={text}
      placeholder={formatMessage({
        id: 'end-users.conditions.builder.value.list',
        defaultMessage: 'Values, separated by commas',
      })}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        setTyped(event.target.value);
        onItems(parseList(event.target.value));
      }}
    />
  );
};

interface FixedValueInputProps {
  label: string;
  slot: ValueSlot;
  operator: string;
  value: FormFixed;
  disabled?: boolean;
  onChange: (value: FormFixed) => void;
}

/** A value typed in, with the control the field's type calls for */
export const FixedValueInput = ({
  label,
  slot,
  operator,
  value,
  disabled,
  onChange,
}: FixedValueInputProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const valueType = valueTypeFor(slot, operator);
  const pattern = PATTERN_OPERATORS.includes(operator);
  const setText = (text: string) => onChange({ kind: 'fixed', valueType, text });

  if (takesList(operator)) {
    const items = value.items ?? [];

    if (slot.enum && !pattern) {
      return (
        <MultiSelect
          aria-label={label}
          disabled={disabled}
          withTags
          value={items}
          onChange={(next: string[]) =>
            onChange({ kind: 'fixed', valueType, text: '', items: next })
          }
        >
          {slot.enum.map((option) => (
            <MultiSelectOption key={option} value={option}>
              {option}
            </MultiSelectOption>
          ))}
        </MultiSelect>
      );
    }

    return (
      <ListText
        label={label}
        items={items}
        disabled={disabled}
        onItems={(next) => onChange({ kind: 'fixed', valueType, text: '', items: next })}
      />
    );
  }

  if (!pattern && valueType === 'boolean') {
    return (
      <SingleSelect
        aria-label={label}
        disabled={disabled}
        value={value.text === '' ? null : value.text}
        onChange={(next) => setText(String(next))}
      >
        <SingleSelectOption value="true">{labels.true}</SingleSelectOption>
        <SingleSelectOption value="false">{labels.false}</SingleSelectOption>
      </SingleSelect>
    );
  }

  if (!pattern && slot.type === 'enumeration' && slot.enum) {
    return (
      <SingleSelect
        aria-label={label}
        disabled={disabled}
        value={value.text === '' ? null : value.text}
        onChange={(next) => setText(String(next))}
      >
        {slot.enum.map((option) => (
          <SingleSelectOption key={option} value={option}>
            {option}
          </SingleSelectOption>
        ))}
      </SingleSelect>
    );
  }

  if (!pattern && slot.type === 'date') {
    return (
      <DatePicker
        aria-label={label}
        disabled={disabled}
        value={dateOf(value.text)}
        onChange={(date?: Date) =>
          setText(
            date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : ''
          )
        }
        onClear={() => setText('')}
      />
    );
  }

  if (!pattern && slot.type === 'datetime') {
    return (
      <DateTimePicker
        aria-label={label}
        disabled={disabled}
        value={dateTimeOf(value.text)}
        onChange={(date?: Date) => setText(date ? date.toISOString() : '')}
        onClear={() => setText('')}
      />
    );
  }

  if (valueType === 'number') {
    return (
      <NumberInput
        aria-label={label}
        disabled={disabled}
        value={
          value.text.trim() !== '' && Number.isFinite(Number(value.text))
            ? Number(value.text)
            : undefined
        }
        onValueChange={(next) => setText(next === undefined ? '' : String(next))}
      />
    );
  }

  return (
    <TextInput
      aria-label={label}
      disabled={disabled}
      value={value.text}
      placeholder={
        slot.type === 'time'
          ? formatMessage({
              id: 'end-users.conditions.builder.value.time',
              defaultMessage: 'HH:mm',
            })
          : undefined
      }
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
    />
  );
};

const nowAllowed = (slot: ValueSlot, operator: string) =>
  (slot.type === 'date' || slot.type === 'datetime') &&
  !PATTERN_OPERATORS.includes(operator) &&
  !takesList(operator);

interface ValueInputProps {
  /** Names the controls: "Which check 1 value" */
  label: string;
  slot: ValueSlot;
  operator: string;
  value?: FormValue;
  inputs: FormInput[];
  layout: BuilderLayout;
  disabled?: boolean;
  onChange: (value: FormValue) => void;
}

/**
 * The value of a check: what kind of value it is (typed in, an input's, the signed-in user's, their
 * profile's, now), then the control for that kind. An operator that takes no value has none.
 */
export const ValueInput = ({
  label,
  slot,
  operator,
  value,
  inputs,
  layout,
  disabled,
  onChange,
}: ValueInputProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();

  if (takesNoValue(operator)) {
    return null;
  }

  const wanted = valueTypeFor(slot, operator);
  const list = takesList(operator);
  const current = value ?? emptyValue(slot, operator);
  const inputOptions = inputValueOptions(inputs, wanted);
  const userOptions = userValueOptions(layout, wanted, list);
  const profileOptions = profileValueOptions(layout, wanted, list);

  const kinds: Array<{ kind: Kind; label: string }> = [
    {
      kind: 'fixed',
      label: formatMessage({
        id: 'end-users.conditions.builder.value.fixed',
        defaultMessage: 'A value',
      }),
    },
  ];

  if (inputOptions.length > 0 && !list) {
    kinds.push({
      kind: 'input',
      label: formatMessage({
        id: 'end-users.conditions.builder.value.input',
        defaultMessage: 'An input',
      }),
    });
  }

  if (userOptions.length > 0) {
    kinds.push({
      kind: 'user',
      label: formatMessage({
        id: 'end-users.conditions.builder.value.user',
        defaultMessage: 'The signed-in user',
      }),
    });
  }

  if (profileOptions.length > 0) {
    kinds.push({
      kind: 'profile',
      label: formatMessage({
        id: 'end-users.conditions.builder.value.profile',
        defaultMessage: "The user's profile",
      }),
    });
  }

  if (nowAllowed(slot, operator)) {
    kinds.push({
      kind: 'now',
      label: formatMessage({ id: 'end-users.conditions.builder.value.now', defaultMessage: 'Now' }),
    });
  }

  const changeKind = (kind: Kind) => {
    switch (kind) {
      case 'input':
        return onChange({ kind, name: inputOptions[0]?.name ?? '' });
      case 'user':
        return onChange({ kind, attribute: userOptions[0] ?? '' });
      case 'profile':
        return onChange({ kind, attribute: profileOptions[0] ?? '' });
      case 'now':
        return onChange({ kind });
      default:
        return onChange(emptyValue(slot, operator));
    }
  };

  const pick = (
    name: Word,
    selected: string,
    options: Array<{ value: string; label: string }>,
    onPick: (next: string) => void
  ) => (
    <SingleSelect
      aria-label={labels.suffix(label, name)}
      disabled={disabled}
      value={selected === '' ? null : selected}
      onChange={(next) => onPick(String(next))}
    >
      {options.map((option) => (
        <SingleSelectOption key={option.value} value={option.value}>
          {option.label}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );

  return (
    <Flex gap={2} alignItems="flex-start" wrap="wrap">
      <SingleSelect
        aria-label={labels.suffix(label, 'kind')}
        disabled={disabled || kinds.length === 1}
        value={current.kind}
        onChange={(next) => changeKind(String(next) as Kind)}
      >
        {kinds.map(({ kind, label: text }) => (
          <SingleSelectOption key={kind} value={kind}>
            {text}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      {current.kind === 'fixed' && (
        <FixedValueInput
          label={label}
          slot={slot}
          operator={operator}
          value={current}
          disabled={disabled}
          onChange={onChange}
        />
      )}
      {current.kind === 'input' &&
        pick(
          'input',
          current.name,
          inputOptions.map(({ name }) => ({ value: name, label: name })),
          (name) => onChange({ kind: 'input', name })
        )}
      {current.kind === 'user' &&
        pick(
          'userAttribute',
          current.attribute,
          userOptions.map((option) => ({ value: option, label: option })),
          (attribute) => onChange({ kind: 'user', attribute })
        )}
      {current.kind === 'profile' &&
        pick(
          'profileAttribute',
          current.attribute,
          profileOptions.map((option) => ({ value: option, label: option })),
          (attribute) => onChange({ kind: 'profile', attribute })
        )}
      {current.kind === 'now' && (
        <>
          <NumberInput
            aria-label={labels.suffix(label, 'offset')}
            disabled={disabled}
            placeholder={formatMessage({
              id: 'end-users.conditions.builder.value.now-offset',
              defaultMessage: 'Offset, negative for before',
            })}
            value={
              current.offset && current.offset.amount.trim() !== ''
                ? Number(current.offset.amount)
                : undefined
            }
            onValueChange={(next) =>
              onChange(
                next === undefined
                  ? { kind: 'now' }
                  : {
                      kind: 'now',
                      offset: { amount: String(next), unit: current.offset?.unit ?? 'days' },
                    }
              )
            }
          />
          {current.offset && (
            <SingleSelect
              aria-label={labels.suffix(label, 'offsetUnit')}
              disabled={disabled}
              value={current.offset.unit}
              onChange={(unit) =>
                onChange({
                  kind: 'now',
                  offset: {
                    amount: current.offset?.amount ?? '',
                    unit: String(unit) as 'minutes' | 'hours' | 'days',
                  },
                })
              }
            >
              <SingleSelectOption value="minutes">{labels.unit('minutes')}</SingleSelectOption>
              <SingleSelectOption value="hours">{labels.unit('hours')}</SingleSelectOption>
              <SingleSelectOption value="days">{labels.unit('days')}</SingleSelectOption>
            </SingleSelect>
          )}
        </>
      )}
    </Flex>
  );
};
