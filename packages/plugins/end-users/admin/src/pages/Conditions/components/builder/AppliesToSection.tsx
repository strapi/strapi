import {
  Field,
  Flex,
  Grid,
  MultiSelect,
  MultiSelectOption,
  Radio,
  TextInput,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../../utils/getTranslation';

import { Section } from './Section';

import type { AppliesTo } from '../../../../../../shared/builder/types';
import type { BuilderLayout } from '../../../../../../shared/contracts/conditions';

interface AppliesToSectionProps {
  slug: string;
  displayName: string;
  appliesTo: AppliesTo;
  layout: BuilderLayout;
  /** A saved condition's name can't change */
  isEditing: boolean;
  disabled: boolean;
  /** What the server refused about each part */
  errors: { slug?: string; displayName?: string; types?: string };
  /** The admin has left a field: what is wrong with it can show */
  onTouch: (part: 'slug' | 'displayName' | 'types') => void;
  onChange: (patch: Partial<{ slug: string; displayName: string; appliesTo: AppliesTo }>) => void;
}

export const AppliesToSection = ({
  slug,
  displayName,
  appliesTo,
  layout,
  isEditing,
  disabled,
  errors,
  onTouch,
  onChange,
}: AppliesToSectionProps) => {
  const { formatMessage } = useIntl();

  return (
    <Section
      title={formatMessage({
        id: getTranslation('conditions.builder.name-and-types'),
        defaultMessage: 'Name and content types',
      })}
    >
      <Grid.Root gap={4}>
        <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
          <Field.Root
            name="slug"
            error={errors.slug}
            required
            hint={formatMessage({
              id: getTranslation('conditions.builder.name.hint'),
              defaultMessage:
                'Lowercase letters, digits and hyphens. Code refers to the condition as api::your-name. It cannot change once it is created.',
            })}
          >
            <Field.Label>
              {formatMessage({ id: 'global.name', defaultMessage: 'Name' })}
            </Field.Label>
            <TextInput
              disabled={disabled || isEditing}
              value={slug}
              onBlur={() => onTouch('slug')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ slug: event.target.value })
              }
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>
        </Grid.Item>
        <Grid.Item xs={12} col={6} direction="column" alignItems="stretch">
          <Field.Root
            name="displayName"
            error={errors.displayName}
            required
            hint={formatMessage({
              id: getTranslation('conditions.builder.display-name.hint'),
              defaultMessage: 'What a role editor shows.',
            })}
          >
            <Field.Label>
              {formatMessage({
                id: getTranslation('conditions.builder.display-name'),
                defaultMessage: 'Display name',
              })}
            </Field.Label>
            <TextInput
              disabled={disabled}
              value={displayName}
              onBlur={() => onTouch('displayName')}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ displayName: event.target.value })
              }
            />
            <Field.Hint />
            <Field.Error />
          </Field.Root>
        </Grid.Item>
        <Grid.Item xs={12} col={12} direction="column" alignItems="stretch">
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Radio.Group
              name="appliesToKind"
              aria-label={formatMessage({
                id: getTranslation('conditions.builder.applies-to'),
                defaultMessage: 'Applies to',
              })}
              value={appliesTo.kind}
              disabled={disabled}
              onValueChange={(kind: string) =>
                onChange({
                  appliesTo:
                    kind === 'types'
                      ? { kind: 'types', types: [] }
                      : { kind: kind as 'all' | 'user-relation' },
                })
              }
            >
              <Radio.Item value="types">
                {formatMessage({
                  id: getTranslation('conditions.builder.applies-to.types'),
                  defaultMessage: 'Chosen content types',
                })}
              </Radio.Item>
              <Radio.Item value="user-relation">
                {formatMessage({
                  id: getTranslation('conditions.builder.applies-to.user-relation'),
                  defaultMessage: 'Every content type that has a relation to the end user',
                })}
              </Radio.Item>
              <Radio.Item value="all">
                {formatMessage({
                  id: getTranslation('conditions.builder.applies-to.all'),
                  defaultMessage: 'Every content type',
                })}
              </Radio.Item>
            </Radio.Group>
            {appliesTo.kind === 'types' && (
              <Field.Root
                name="types"
                error={errors.types}
                required
                hint={formatMessage({
                  id: getTranslation('conditions.builder.applies-to.hint'),
                  defaultMessage: 'The content types a role can use this condition on.',
                })}
              >
                <Field.Label>
                  {formatMessage({
                    id: getTranslation('conditions.builder.content-types'),
                    defaultMessage: 'Content types',
                  })}
                </Field.Label>
                <MultiSelect
                  value={appliesTo.types}
                  onChange={(types: string[]) => onChange({ appliesTo: { kind: 'types', types } })}
                  disabled={disabled}
                  onOpenChange={(open: boolean) => !open && onTouch('types')}
                  withTags
                  placeholder={formatMessage({
                    id: getTranslation('conditions.builder.applies-to.placeholder'),
                    defaultMessage: 'Choose content types',
                  })}
                >
                  {layout.contentTypes.map(({ uid, displayName: label }) => (
                    <MultiSelectOption key={uid} value={uid}>
                      {label}
                    </MultiSelectOption>
                  ))}
                </MultiSelect>
                <Field.Hint />
                <Field.Error />
              </Field.Root>
            )}
          </Flex>
        </Grid.Item>
      </Grid.Root>
    </Section>
  );
};
