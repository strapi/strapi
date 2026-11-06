import {
  Box,
  Button,
  Flex,
  IconButton,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { operatorsFor, takesNoValue } from '../../../../../../shared/builder/operators';
import { newKey } from '../../utils/builderForm';
import { pathOptions, reshapeValue, slotOfAccepts, slotOfPath } from '../../utils/builderOptions';

import { useLabels } from './labels';
import { OperatorSelect } from './OperatorSelect';
import { Section } from './Section';
import { ValueInput } from './ValueInput';

import type { FieldTarget } from '../../../../../../shared/builder/types';
import type {
  BuilderAttribute,
  BuilderLayout,
} from '../../../../../../shared/contracts/conditions';
import type { FormCheck, FormGroup, FormInput } from '../../utils/builderForm';
import type { ValueSlot } from '../../utils/builderOptions';

const FIELD_INPUT = 'field-input:';

interface Offered {
  layout: BuilderLayout;
  /** What the chosen content types share */
  fields: BuilderAttribute[];
  inputs: FormInput[];
  disabled: boolean;
}

const targetKey = (target: FieldTarget) =>
  'input' in target ? `${FIELD_INPUT}${target.input}` : target.path.join('.');

const slotOfTarget = ({ layout, fields, inputs }: Offered, target: FieldTarget) => {
  if ('input' in target) {
    const input = inputs.find(({ name, kind }) => kind === 'field' && name === target.input);

    return input ? slotOfAccepts(input.accepts) : undefined;
  }

  return slotOfPath(layout, fields, target.path);
};

/** A check on the first field on offer, with the first operator it takes */
const newCheck = (offered: Offered): FormCheck | undefined => {
  const [first] = pathOptions(offered.layout, offered.fields);
  const target: FieldTarget | undefined = first
    ? { path: first.path }
    : offered.inputs
        .filter(({ kind, name }) => kind === 'field' && name !== '')
        .map(({ name }) => ({ input: name }))[0];
  const slot = target ? slotOfTarget(offered, target) : undefined;

  if (!target || !slot) {
    return undefined;
  }

  const [operator] = operatorsFor(slot.type);

  return {
    key: newKey(),
    kind: 'check',
    target,
    operator,
    value: reshapeValue(undefined, slot, operator),
  };
};

interface CheckRowProps {
  label: string;
  check: FormCheck;
  offered: Offered;
  onChange: (check: FormCheck) => void;
  onRemove: () => void;
}

const CheckRow = ({ label, check, offered, onChange, onRemove }: CheckRowProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const { layout, fields, inputs, disabled } = offered;
  const options = pathOptions(layout, fields);
  const fieldInputs = inputs.filter(({ kind, name }) => kind === 'field' && name !== '');
  const slot: ValueSlot | undefined = slotOfTarget(offered, check.target);
  const current = targetKey(check.target);
  const offeredNow =
    options.some(({ value }) => value === current) ||
    fieldInputs.some(({ name }) => `${FIELD_INPUT}${name}` === current);

  const changeTarget = (key: string) => {
    const target: FieldTarget = key.startsWith(FIELD_INPUT)
      ? { input: key.slice(FIELD_INPUT.length) }
      : { path: key.split('.') };
    const next = slotOfTarget(offered, target);

    if (!next) {
      return onChange({ ...check, target });
    }

    const operator = operatorsFor(next.type).includes(check.operator)
      ? check.operator
      : operatorsFor(next.type)[0];

    return onChange({
      ...check,
      target,
      operator,
      value: reshapeValue(check.value, next, operator),
    });
  };

  const changeOperator = (operator: string) =>
    onChange({
      ...check,
      operator,
      ...(slot ? { value: reshapeValue(check.value, slot, operator) } : {}),
    });

  return (
    <Flex role="group" aria-label={label} gap={2} alignItems="flex-start" wrap="wrap">
      <SingleSelect
        aria-label={labels.suffix(label, 'field')}
        disabled={disabled}
        value={current === '' ? null : current}
        onChange={(next) => changeTarget(String(next))}
      >
        {!offeredNow && current !== '' && (
          <SingleSelectOption value={current}>{current}</SingleSelectOption>
        )}
        {options.map(({ value }) => (
          <SingleSelectOption key={value} value={value}>
            {value}
          </SingleSelectOption>
        ))}
        {fieldInputs.map(({ name }) => (
          <SingleSelectOption key={name} value={`${FIELD_INPUT}${name}`}>
            {formatMessage(
              {
                id: 'end-users.conditions.builder.which.field-input',
                defaultMessage: 'the field chosen for {name}',
              },
              { name }
            )}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <OperatorSelect
        label={labels.suffix(label, 'operator')}
        slot={slot}
        value={check.operator}
        disabled={disabled}
        onChange={changeOperator}
      />
      {slot && !takesNoValue(check.operator) && (
        <ValueInput
          label={labels.suffix(label, 'value')}
          slot={slot}
          operator={check.operator}
          value={check.value}
          inputs={inputs}
          layout={layout}
          disabled={disabled}
          onChange={(value) => onChange({ ...check, value })}
        />
      )}
      <IconButton
        label={formatMessage({
          id: 'end-users.conditions.builder.which.remove-check',
          defaultMessage: 'Remove check',
        })}
        disabled={disabled}
        variant="ghost"
        onClick={onRemove}
      >
        <Trash />
      </IconButton>
    </Flex>
  );
};

interface GroupEditorProps {
  label: string;
  group: FormGroup;
  offered: Offered;
  depth: number;
  onChange: (group: FormGroup) => void;
  onRemove?: () => void;
}

/** A group of checks: how they combine, the checks, and (at the root only) the groups inside it */
const GroupEditor = ({ label, group, offered, depth, onChange, onRemove }: GroupEditorProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const { disabled } = offered;
  const setItem = (index: number, item: FormGroup['items'][number]) =>
    onChange({ ...group, items: group.items.map((it, at) => (at === index ? item : it)) });
  const removeItem = (index: number) =>
    onChange({ ...group, items: group.items.filter((_, at) => at !== index) });
  const add = (item: FormGroup['items'][number]) =>
    onChange({ ...group, items: [...group.items, item] });
  const canAdd = newCheck(offered) !== undefined;

  return (
    <Box
      role="group"
      aria-label={label}
      padding={depth === 0 ? 0 : 4}
      background={depth === 0 ? undefined : 'neutral100'}
      borderColor={depth === 0 ? undefined : 'neutral200'}
      hasRadius
    >
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Flex gap={2} alignItems="center">
          <SingleSelect
            aria-label={labels.suffix(label, 'match')}
            disabled={disabled}
            value={group.match}
            onChange={(next) => onChange({ ...group, match: String(next) as FormGroup['match'] })}
          >
            <SingleSelectOption value="all">
              {formatMessage({
                id: 'end-users.conditions.builder.group.all',
                defaultMessage: 'All of',
              })}
            </SingleSelectOption>
            <SingleSelectOption value="any">
              {formatMessage({
                id: 'end-users.conditions.builder.group.any',
                defaultMessage: 'Any of',
              })}
            </SingleSelectOption>
            <SingleSelectOption value="none">
              {formatMessage({
                id: 'end-users.conditions.builder.group.none',
                defaultMessage: 'None of',
              })}
            </SingleSelectOption>
          </SingleSelect>
          {onRemove && (
            <IconButton
              label={formatMessage({
                id: 'end-users.conditions.builder.which.remove-group',
                defaultMessage: 'Remove group',
              })}
              disabled={disabled}
              variant="ghost"
              onClick={onRemove}
            >
              <Trash />
            </IconButton>
          )}
        </Flex>
        {group.items.map((item, index) =>
          item.kind === 'group' ? (
            <GroupEditor
              key={item.key}
              label={labels.group(label, index + 1)}
              group={item}
              offered={offered}
              depth={depth + 1}
              onChange={(next) => setItem(index, next)}
              onRemove={() => removeItem(index)}
            />
          ) : (
            <CheckRow
              key={item.key}
              label={labels.check(label, index + 1)}
              check={item}
              offered={offered}
              onChange={(next) => setItem(index, next)}
              onRemove={() => removeItem(index)}
            />
          )
        )}
        <Flex gap={2}>
          <Button
            type="button"
            variant="tertiary"
            size="S"
            startIcon={<Plus />}
            disabled={disabled || !canAdd}
            onClick={() => {
              const created = newCheck(offered);

              if (created) {
                add(created);
              }
            }}
          >
            {formatMessage({
              id: 'end-users.conditions.builder.which.add-check',
              defaultMessage: 'Add check',
            })}
          </Button>
          {depth === 0 && (
            <Button
              type="button"
              variant="tertiary"
              size="S"
              startIcon={<Plus />}
              disabled={disabled}
              onClick={() => {
                const seed = newCheck(offered);

                add({ key: newKey(), kind: 'group', match: 'any', items: seed ? [seed] : [] });
              }}
            >
              {formatMessage({
                id: 'end-users.conditions.builder.which.add-group',
                defaultMessage: 'Add group',
              })}
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

interface WhichSectionProps extends Offered {
  which: FormGroup;
  onChange: (which: FormGroup) => void;
}

export const WhichSection = ({ which, onChange, ...offered }: WhichSectionProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();

  return (
    <Section
      title={formatMessage({
        id: 'end-users.conditions.builder.which',
        defaultMessage: 'Which entries',
      })}
      description={formatMessage({
        id: 'end-users.conditions.builder.which.description',
        defaultMessage:
          'The entries a user can reach. The checks use the fields every chosen content type has.',
      })}
    >
      <GroupEditor
        label={labels.which}
        group={which}
        offered={offered}
        depth={0}
        onChange={onChange}
      />
    </Section>
  );
};

export { GroupEditor, CheckRow };
