import {
  Button,
  Field,
  Flex,
  IconButton,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../../utils/getTranslation';
import { newKey } from '../../utils/builderForm';
import {
  USER_UID,
  inputValueOptions,
  isFilterable,
  valueTypeFor,
} from '../../utils/builderOptions';

import { useLabels } from './labels';
import { Section } from './Section';
import { FixedValueInput } from './ValueInput';

import type { BuilderAttribute } from '../../../../../../shared/contracts/conditions';
import type { FormInput, FormStamp } from '../../utils/builderForm';
import type { ValueSlot } from '../../utils/builderOptions';

type OnSave = { stamp: FormStamp[]; locked: string[] };

interface OnSaveSectionProps {
  onSave: OnSave;
  /** What the chosen content types share */
  fields: BuilderAttribute[];
  inputs: FormInput[];
  disabled: boolean;
  onChange: (onSave: OnSave) => void;
}

/** A stamp sets a plain field, or a relation to the end user */
const stampable = (field: BuilderAttribute) =>
  isFilterable(field) || field.relation?.target === USER_UID;

const slotOfField = (field: BuilderAttribute | undefined): ValueSlot | undefined =>
  field && isFilterable(field)
    ? { type: field.type, ...(field.enum ? { enum: field.enum } : {}) }
    : undefined;

const emptyStampValue = (field: BuilderAttribute | undefined): FormStamp['value'] => {
  const slot = slotOfField(field);

  return slot
    ? { kind: 'fixed', valueType: valueTypeFor(slot, '$eq'), text: '' }
    : { kind: 'user' };
};

/** What happens when an entry is saved: fields set to a value on create, and fields that can't change on update */
export const OnSaveSection = ({
  onSave,
  fields,
  inputs,
  disabled,
  onChange,
}: OnSaveSectionProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const options = fields.filter(stampable);
  const setStamp = (index: number, stamp: FormStamp) =>
    onChange({ ...onSave, stamp: onSave.stamp.map((it, at) => (at === index ? stamp : it)) });

  return (
    <Section
      title={formatMessage({
        id: getTranslation('conditions.builder.on-save'),
        defaultMessage: 'When an entry is saved',
      })}
      description={formatMessage({
        id: getTranslation('conditions.builder.on-save.description'),
        defaultMessage:
          'Fields set when an entry is created, and fields that cannot change afterwards.',
      })}
    >
      {onSave.stamp.map((rule, index) => {
        const label = labels.stampRow(index + 1);
        const field = fields.find(({ name }) => name === rule.field);
        const slot = slotOfField(field);
        const kinds = inputValueOptions(inputs, slot ? valueTypeFor(slot, '$eq') : 'string');

        return (
          <Flex
            key={rule.key}
            role="group"
            aria-label={label}
            gap={2}
            alignItems="flex-start"
            wrap="wrap"
          >
            <SingleSelect
              aria-label={labels.suffix(label, 'field')}
              disabled={disabled}
              value={rule.field === '' ? null : rule.field}
              placeholder={formatMessage({
                id: getTranslation('conditions.builder.on-save.choose-field'),
                defaultMessage: 'Choose a field',
              })}
              onChange={(next) =>
                setStamp(index, {
                  ...rule,
                  field: String(next),
                  value: emptyStampValue(fields.find(({ name }) => name === String(next))),
                })
              }
            >
              {options.map(({ name }) => (
                <SingleSelectOption key={name} value={name}>
                  {name}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            {rule.field !== '' && !slot && (
              <Typography>
                {formatMessage({
                  id: getTranslation('conditions.builder.on-save.to-user'),
                  defaultMessage: 'Set to the signed-in user',
                })}
              </Typography>
            )}
            {slot && (
              <>
                <SingleSelect
                  aria-label={labels.suffix(label, 'valueKind')}
                  disabled={disabled || kinds.length === 0}
                  value={rule.value.kind}
                  onChange={(next) =>
                    setStamp(index, {
                      ...rule,
                      value:
                        next === 'input'
                          ? { kind: 'input', name: kinds[0]?.name ?? '' }
                          : emptyStampValue(field),
                    })
                  }
                >
                  <SingleSelectOption value="fixed">
                    {formatMessage({
                      id: getTranslation('conditions.builder.value.fixed'),
                      defaultMessage: 'A value',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="input">
                    {formatMessage({
                      id: getTranslation('conditions.builder.value.input'),
                      defaultMessage: 'An input',
                    })}
                  </SingleSelectOption>
                </SingleSelect>
                {rule.value.kind === 'fixed' && (
                  <FixedValueInput
                    label={labels.suffix(label, 'value')}
                    slot={slot}
                    operator="$eq"
                    value={rule.value}
                    disabled={disabled}
                    onChange={(value) => setStamp(index, { ...rule, value })}
                  />
                )}
                {rule.value.kind === 'input' && (
                  <SingleSelect
                    aria-label={labels.suffix(label, 'input')}
                    disabled={disabled}
                    value={rule.value.name === '' ? null : rule.value.name}
                    onChange={(name) =>
                      setStamp(index, { ...rule, value: { kind: 'input', name: String(name) } })
                    }
                  >
                    {kinds.map(({ name }) => (
                      <SingleSelectOption key={name} value={name}>
                        {name}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              </>
            )}
            <IconButton
              label={formatMessage({
                id: getTranslation('conditions.builder.on-save.remove-stamp'),
                defaultMessage: 'Remove field',
              })}
              disabled={disabled}
              variant="ghost"
              onClick={() =>
                onChange({ ...onSave, stamp: onSave.stamp.filter((_, at) => at !== index) })
              }
            >
              <Trash />
            </IconButton>
          </Flex>
        );
      })}
      <Flex>
        <Button
          type="button"
          variant="tertiary"
          size="S"
          startIcon={<Plus />}
          disabled={disabled || options.length === 0}
          onClick={() =>
            onChange({
              ...onSave,
              stamp: [...onSave.stamp, { key: newKey(), field: '', value: { kind: 'user' } }],
            })
          }
        >
          {formatMessage({
            id: getTranslation('conditions.builder.on-save.add-stamp'),
            defaultMessage: 'Set a field on create',
          })}
        </Button>
      </Flex>
      <Field.Root name="locked">
        <Field.Label>
          {formatMessage({
            id: getTranslation('conditions.builder.on-save.locked'),
            defaultMessage: 'Fields that cannot change after create',
          })}
        </Field.Label>
        <MultiSelect
          value={onSave.locked}
          disabled={disabled}
          withTags
          placeholder={formatMessage({
            id: getTranslation('conditions.builder.on-save.locked-placeholder'),
            defaultMessage: 'Choose fields',
          })}
          onChange={(locked: string[]) => onChange({ ...onSave, locked })}
        >
          {fields.map(({ name }) => (
            <MultiSelectOption key={name} value={name}>
              {name}
            </MultiSelectOption>
          ))}
        </MultiSelect>
      </Field.Root>
    </Section>
  );
};
