import {
  Button,
  Flex,
  IconButton,
  MultiSelect,
  MultiSelectOption,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { operatorsFor, takesNoValue } from '../../../../../../shared/builder/operators';
import { getTranslation } from '../../../../utils/getTranslation';
import { newKey } from '../../utils/builderForm';
import { isFilterable, reshapeValue } from '../../utils/builderOptions';

import { useLabels } from './labels';
import { OperatorSelect } from './OperatorSelect';
import { Section } from './Section';
import { ValueInput } from './ValueInput';

import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';
import type { BuilderForm, FormInput, FormWhoCheck } from '../../utils/builderForm';

type Who = BuilderForm['who'];
type AttributeCheck = Extract<FormWhoCheck, { kind: 'attribute' }>;

interface WhoSectionProps {
  who: Who;
  layout: BuilderLayout;
  inputs: FormInput[];
  disabled: boolean;
  onChange: (who: Who) => void;
}

const attributesOf = (layout: BuilderLayout, source: 'user' | 'profile') =>
  (source === 'user' ? layout.userAttributes : layout.profileAttributes).filter(isFilterable);

const AttributeRow = ({
  label,
  check,
  layout,
  inputs,
  disabled,
  onChange,
  onRemove,
}: {
  label: string;
  check: AttributeCheck;
  layout: BuilderLayout;
  inputs: FormInput[];
  disabled: boolean;
  onChange: (check: AttributeCheck) => void;
  onRemove: () => void;
}) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const attributes = attributesOf(layout, check.source);
  const attribute = attributes.find(({ name }) => name === check.attribute);
  const slot = attribute
    ? { type: attribute.type, ...(attribute.enum ? { enum: attribute.enum } : {}) }
    : undefined;

  const changeAttribute = (name: string) => {
    const found = attributes.find((candidate) => candidate.name === name);

    if (!found) {
      return;
    }

    const next = { type: found.type, ...(found.enum ? { enum: found.enum } : {}) };
    const [first] = operatorsFor(found.type);
    const operator = operatorsFor(found.type).includes(check.operator) ? check.operator : first;

    onChange({
      ...check,
      attribute: name,
      operator,
      value: reshapeValue(check.value, next, operator),
    });
  };

  return (
    <Flex role="group" aria-label={label} gap={2} alignItems="flex-start" wrap="wrap">
      <SingleSelect
        aria-label={labels.suffix(label, 'source')}
        disabled={disabled}
        value={check.source}
        onChange={(next) => {
          const source = String(next) as 'user' | 'profile';
          const [first] = attributesOf(layout, source);

          if (first) {
            const slotOfFirst = { type: first.type, ...(first.enum ? { enum: first.enum } : {}) };
            const [operator] = operatorsFor(first.type);

            onChange({
              ...check,
              source,
              attribute: first.name,
              operator,
              value: reshapeValue(undefined, slotOfFirst, operator),
            });
          }
        }}
      >
        <SingleSelectOption value="user">
          {formatMessage({
            id: getTranslation('conditions.builder.who.source-user'),
            defaultMessage: 'The user',
          })}
        </SingleSelectOption>
        <SingleSelectOption value="profile">
          {formatMessage({
            id: getTranslation('conditions.builder.who.source-profile'),
            defaultMessage: 'Their profile',
          })}
        </SingleSelectOption>
      </SingleSelect>
      <SingleSelect
        aria-label={labels.suffix(label, 'attribute')}
        disabled={disabled}
        value={attribute ? check.attribute : null}
        onChange={(next) => changeAttribute(String(next))}
      >
        {attributes.map(({ name }) => (
          <SingleSelectOption key={name} value={name}>
            {name}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <OperatorSelect
        label={labels.suffix(label, 'operator')}
        slot={slot}
        value={check.operator}
        disabled={disabled}
        onChange={(operator) =>
          onChange({
            ...check,
            operator,
            ...(slot ? { value: reshapeValue(check.value, slot, operator) } : {}),
          })
        }
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
          id: getTranslation('conditions.builder.who.remove-check'),
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

/** Who the condition is for: checks on the signed-in user, evaluated per request. Never a filter. */
export const WhoSection = ({ who, layout, inputs, disabled, onChange }: WhoSectionProps) => {
  const { formatMessage } = useIntl();
  const labels = useLabels();
  const setCheck = (index: number, check: FormWhoCheck) =>
    onChange({ ...who, checks: who.checks.map((it, at) => (at === index ? check : it)) });
  const removeCheck = (index: number) =>
    onChange({ ...who, checks: who.checks.filter((_, at) => at !== index) });
  const addCheck = (check: FormWhoCheck) => onChange({ ...who, checks: [...who.checks, check] });

  const firstAttribute = attributesOf(layout, 'user')[0];

  return (
    <Section
      title={formatMessage({
        id: getTranslation('conditions.builder.who'),
        defaultMessage: 'Who it applies to',
      })}
      description={formatMessage({
        id: getTranslation('conditions.builder.who.description'),
        defaultMessage:
          'Checks on the signed-in user. A condition that reads the user is false for Public.',
      })}
    >
      {who.checks.length > 1 && (
        <SingleSelect
          aria-label={formatMessage({
            id: getTranslation('conditions.builder.who.match'),
            defaultMessage: 'Who match',
          })}
          disabled={disabled}
          value={who.match}
          onChange={(next) => onChange({ ...who, match: String(next) as Who['match'] })}
        >
          <SingleSelectOption value="all">
            {formatMessage({
              id: getTranslation('conditions.builder.who.match-all'),
              defaultMessage: 'All of these are true',
            })}
          </SingleSelectOption>
          <SingleSelectOption value="any">
            {formatMessage({
              id: getTranslation('conditions.builder.who.match-any'),
              defaultMessage: 'Any of these is true',
            })}
          </SingleSelectOption>
        </SingleSelect>
      )}
      {who.checks.map((check, index) => {
        const label = labels.whoRow(index + 1);

        if (check.kind === 'attribute') {
          return (
            <AttributeRow
              key={check.key}
              label={label}
              check={check}
              layout={layout}
              inputs={inputs}
              disabled={disabled}
              onChange={(next) => setCheck(index, next)}
              onRemove={() => removeCheck(index)}
            />
          );
        }

        return (
          <Flex key={check.key} role="group" aria-label={label} gap={2} alignItems="flex-start">
            {check.kind === 'roles' ? (
              <>
                <SingleSelect
                  aria-label={labels.suffix(label, 'match')}
                  disabled={disabled}
                  value={check.match}
                  onChange={(next) =>
                    setCheck(index, { ...check, match: String(next) as 'any' | 'none' })
                  }
                >
                  <SingleSelectOption value="any">
                    {formatMessage({
                      id: getTranslation('conditions.builder.who.roles-any'),
                      defaultMessage: 'Holds any of',
                    })}
                  </SingleSelectOption>
                  <SingleSelectOption value="none">
                    {formatMessage({
                      id: getTranslation('conditions.builder.who.roles-none'),
                      defaultMessage: 'Holds none of',
                    })}
                  </SingleSelectOption>
                </SingleSelect>
                <MultiSelect
                  aria-label={labels.suffix(label, 'roles')}
                  disabled={disabled}
                  withTags
                  value={check.roles}
                  placeholder={formatMessage({
                    id: getTranslation('conditions.builder.who.roles-placeholder'),
                    defaultMessage: 'Choose roles',
                  })}
                  onChange={(roles: string[]) => setCheck(index, { ...check, roles })}
                >
                  {layout.roles.map((role) => (
                    <MultiSelectOption key={role} value={role}>
                      {role}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
              </>
            ) : (
              <SingleSelect
                aria-label={labels.suffix(label, 'email')}
                disabled={disabled}
                value={check.value ? 'yes' : 'no'}
                onChange={(next) => setCheck(index, { ...check, value: next === 'yes' })}
              >
                <SingleSelectOption value="yes">
                  {formatMessage({
                    id: getTranslation('conditions.builder.who.email-verified'),
                    defaultMessage: 'Has a verified email',
                  })}
                </SingleSelectOption>
                <SingleSelectOption value="no">
                  {formatMessage({
                    id: getTranslation('conditions.builder.who.email-not-verified'),
                    defaultMessage: 'Has an email that is not verified',
                  })}
                </SingleSelectOption>
              </SingleSelect>
            )}
            <IconButton
              label={formatMessage({
                id: getTranslation('conditions.builder.who.remove-check'),
                defaultMessage: 'Remove check',
              })}
              disabled={disabled}
              variant="ghost"
              onClick={() => removeCheck(index)}
            >
              <Trash />
            </IconButton>
          </Flex>
        );
      })}
      <Flex gap={2} wrap="wrap">
        <Button
          type="button"
          variant="tertiary"
          size="S"
          startIcon={<Plus />}
          disabled={disabled}
          onClick={() => addCheck({ key: newKey(), kind: 'roles', match: 'any', roles: [] })}
        >
          {formatMessage({
            id: getTranslation('conditions.builder.who.add-roles'),
            defaultMessage: 'Add roles check',
          })}
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="S"
          startIcon={<Plus />}
          disabled={disabled}
          onClick={() => addCheck({ key: newKey(), kind: 'email-verified', value: true })}
        >
          {formatMessage({
            id: getTranslation('conditions.builder.who.add-email-verified'),
            defaultMessage: 'Add verified email check',
          })}
        </Button>
        <Button
          type="button"
          variant="tertiary"
          size="S"
          startIcon={<Plus />}
          disabled={disabled || !firstAttribute}
          onClick={() => {
            if (!firstAttribute) {
              return;
            }

            const slot = {
              type: firstAttribute.type,
              ...(firstAttribute.enum ? { enum: firstAttribute.enum } : {}),
            };
            const [operator] = operatorsFor(firstAttribute.type);

            addCheck({
              key: newKey(),
              kind: 'attribute',
              source: 'user',
              attribute: firstAttribute.name,
              operator,
              value: reshapeValue(undefined, slot, operator),
            });
          }}
        >
          {formatMessage({
            id: getTranslation('conditions.builder.who.add-attribute'),
            defaultMessage: 'Add attribute check',
          })}
        </Button>
      </Flex>
    </Section>
  );
};
