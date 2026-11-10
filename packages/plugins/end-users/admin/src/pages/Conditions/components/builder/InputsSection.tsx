import {
  Button,
  Field,
  Flex,
  IconButton,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Toggle,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { BUILDER_LIMITS } from '../../../../../../shared/builder/types';
import { getTranslation } from '../../../../utils/getTranslation';
import { newKey } from '../../utils/builderForm';

import { useLabels } from './labels';
import { Section } from './Section';

import type { FieldAccepts } from '../../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';
import type { FormInput } from '../../utils/builderForm';

interface InputsSectionProps {
  inputs: FormInput[];
  /** The rows the saved file already has, by key: their names can't change */
  savedKeys: string[];
  layout: BuilderLayout;
  disabled: boolean;
  onChange: (inputs: FormInput[]) => void;
}

const acceptsKey = (accepts: FieldAccepts | undefined) =>
  typeof accepts === 'object' ? 'relation' : (accepts ?? '');

export const InputsSection = ({
  inputs,
  savedKeys,
  layout,
  disabled,
  onChange,
}: InputsSectionProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const set = (index: number, input: FormInput) =>
    onChange(inputs.map((it, at) => (at === index ? input : it)));

  return (
    <Section
      title={formatMessage({
        id: getTranslation('conditions.builder.inputs'),
        defaultMessage: 'Inputs',
      })}
      description={formatMessage({
        id: getTranslation('conditions.builder.inputs.description'),
        defaultMessage:
          'Values a role gives when it uses this condition. A check can compare with an input, or be about the field an input names.',
      })}
    >
      {inputs.map((input, index) => {
        const label = labels.inputRow(index + 1);
        const saved = savedKeys.includes(input.key);
        const defaultKind = input.kind;

        return (
          <Flex
            key={input.key}
            role="group"
            aria-label={label}
            gap={2}
            alignItems="flex-start"
            wrap="wrap"
          >
            <Field.Root
              name={`input-${input.key}-name`}
              hint={
                saved
                  ? formatMessage({
                      id: getTranslation('conditions.builder.inputs.name-locked'),
                      defaultMessage: "Input names can't change once saved",
                    })
                  : undefined
              }
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('conditions.builder.inputs.name'),
                  defaultMessage: 'Input name',
                })}
              </Field.Label>
              <TextInput
                aria-label={labels.suffix(label, 'name')}
                disabled={disabled || saved}
                value={input.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  set(index, { ...input, name: event.target.value })
                }
              />
              <Field.Hint />
            </Field.Root>
            <SingleSelect
              aria-label={labels.suffix(label, 'kind')}
              disabled={disabled}
              value={input.kind}
              onChange={(next) => {
                const kind = String(next) as FormInput['kind'];
                const { default: _dropped, accepts: _accepts, ...rest } = input;

                set(index, {
                  ...rest,
                  kind,
                  // A field input is always required: unbound, the condition could never hold
                  ...(kind === 'field' ? { accepts: 'text' as const, required: true } : {}),
                });
              }}
            >
              <SingleSelectOption value="text">
                {formatMessage({
                  id: getTranslation('conditions.builder.inputs.kind-text'),
                  defaultMessage: 'Text',
                })}
              </SingleSelectOption>
              <SingleSelectOption value="number">
                {formatMessage({
                  id: getTranslation('conditions.builder.inputs.kind-number'),
                  defaultMessage: 'Number',
                })}
              </SingleSelectOption>
              <SingleSelectOption value="boolean">
                {formatMessage({
                  id: getTranslation('conditions.builder.inputs.kind-boolean'),
                  defaultMessage: 'True or false',
                })}
              </SingleSelectOption>
              <SingleSelectOption value="field">
                {formatMessage({
                  id: getTranslation('conditions.builder.inputs.kind-field'),
                  defaultMessage: 'A field',
                })}
              </SingleSelectOption>
            </SingleSelect>
            {input.kind === 'field' && (
              <>
                <SingleSelect
                  aria-label={labels.suffix(label, 'fieldKind')}
                  disabled={disabled}
                  value={acceptsKey(input.accepts)}
                  onChange={(next) => {
                    const key = String(next);

                    set(index, {
                      ...input,
                      accepts:
                        key === 'relation'
                          ? { relation: layout.contentTypes[0]?.uid ?? '' }
                          : (key as 'text' | 'number' | 'date' | 'boolean'),
                    });
                  }}
                >
                  <SingleSelectOption value="text">
                    {formatMessage({
                      id: getTranslation('conditions.builder.inputs.accepts-text'),
                      defaultMessage: 'A text field',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="number">
                    {formatMessage({
                      id: getTranslation('conditions.builder.inputs.accepts-number'),
                      defaultMessage: 'A number field',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="date">
                    {formatMessage({
                      id: getTranslation('conditions.builder.inputs.accepts-date'),
                      defaultMessage: 'A date field',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="boolean">
                    {formatMessage({
                      id: getTranslation('conditions.builder.inputs.accepts-boolean'),
                      defaultMessage: 'A true or false field',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="relation">
                    {formatMessage({
                      id: getTranslation('conditions.builder.inputs.accepts-relation'),
                      defaultMessage: 'A relation',
                    })}
                  </SingleSelectOption>
                </SingleSelect>
                {typeof input.accepts === 'object' && (
                  <SingleSelect
                    aria-label={labels.suffix(label, 'relationTarget')}
                    disabled={disabled}
                    value={input.accepts.relation === '' ? null : input.accepts.relation}
                    onChange={(uid) => set(index, { ...input, accepts: { relation: String(uid) } })}
                  >
                    {layout.contentTypes.map(({ uid, displayName }) => (
                      <SingleSelectOption key={uid} value={uid}>
                        {displayName}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                )}
              </>
            )}
            <Field.Root name={`input-${input.key}-required`}>
              <Toggle
                aria-label={labels.suffix(label, 'required')}
                disabled={disabled || input.kind === 'field'}
                checked={input.required || input.kind === 'field'}
                onLabel={formatMessage({
                  id: getTranslation('conditions.builder.inputs.required'),
                  defaultMessage: 'Required',
                })}
                offLabel={formatMessage({
                  id: getTranslation('conditions.builder.inputs.optional'),
                  defaultMessage: 'Optional',
                })}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  set(index, { ...input, required: event.target.checked })
                }
              />
            </Field.Root>
            {defaultKind === 'number' && (
              <NumberInput
                aria-label={labels.suffix(label, 'default')}
                disabled={disabled}
                placeholder={formatMessage({
                  id: getTranslation('conditions.builder.inputs.default'),
                  defaultMessage: 'Default',
                })}
                value={
                  input.default !== undefined && input.default.trim() !== ''
                    ? Number(input.default)
                    : undefined
                }
                onValueChange={(next) => {
                  const { default: _dropped, ...rest } = input;

                  set(index, next === undefined ? rest : { ...rest, default: String(next) });
                }}
              />
            )}
            {defaultKind === 'boolean' && (
              <SingleSelect
                aria-label={labels.suffix(label, 'default')}
                disabled={disabled}
                placeholder={formatMessage({
                  id: getTranslation('conditions.builder.inputs.default'),
                  defaultMessage: 'Default',
                })}
                value={input.default ?? null}
                onChange={(next) => set(index, { ...input, default: String(next) })}
              >
                <SingleSelectOption value="true">{labels.true}</SingleSelectOption>
                <SingleSelectOption value="false">{labels.false}</SingleSelectOption>
              </SingleSelect>
            )}
            {defaultKind === 'text' && (
              <TextInput
                aria-label={labels.suffix(label, 'default')}
                disabled={disabled}
                placeholder={formatMessage({
                  id: getTranslation('conditions.builder.inputs.default'),
                  defaultMessage: 'Default',
                })}
                value={input.default ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const { default: _dropped, ...rest } = input;

                  set(
                    index,
                    event.target.value === '' ? rest : { ...rest, default: event.target.value }
                  );
                }}
              />
            )}
            <IconButton
              label={formatMessage({
                id: getTranslation('conditions.builder.inputs.remove'),
                defaultMessage: 'Remove input',
              })}
              disabled={disabled}
              variant="ghost"
              onClick={() => onChange(inputs.filter((_, at) => at !== index))}
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
          disabled={disabled || inputs.length >= BUILDER_LIMITS.inputs}
          onClick={() =>
            onChange([...inputs, { key: newKey(), name: '', kind: 'text', required: false }])
          }
        >
          {formatMessage({
            id: getTranslation('conditions.builder.inputs.add'),
            defaultMessage: 'Add input',
          })}
        </Button>
      </Flex>
    </Section>
  );
};
