import * as React from 'react';

import {
  Box,
  Flex,
  MultiSelect,
  MultiSelectGroup,
  MultiSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../../utils/getTranslation';
import { ACTION_MESSAGES } from '../../utils/actionLabels';

import type {
  ConditionRef,
  ConditionSource,
  DataAction,
  LayoutCondition,
} from '../../../../../../shared/contracts/permissions';
import type { MessageDescriptor } from 'react-intl';

const SOURCES: Array<{ source: ConditionSource; message: MessageDescriptor }> = [
  {
    source: 'builtin',
    message: { id: getTranslation('roles.settings.source.builtin'), defaultMessage: 'Built-in' },
  },
  {
    source: 'plugin',
    message: { id: getTranslation('roles.settings.source.plugin'), defaultMessage: 'Plugin' },
  },
  {
    source: 'code',
    message: { id: getTranslation('roles.settings.source.code'), defaultMessage: 'Code' },
  },
  {
    source: 'builder',
    message: { id: getTranslation('roles.settings.source.builder'), defaultMessage: 'Builder' },
  },
];

interface ConditionActionRowProps {
  action: DataAction;
  /** What the layout offers on this content type */
  available: LayoutCondition[];
  /** Chosen conditions the layout lacks: listed so unticking them is the way out of them */
  unavailable: ConditionRef[];
  value: ConditionRef[];
  isGrey: boolean;
  isReadOnly: boolean;
  onChange: (names: string[]) => void;
  /** The inputs of the chosen conditions, drawn under the row */
  children?: React.ReactNode;
}

const unavailableName = (name: string) => `unavailable:${name}`;

/**
 * One granted action: "Can <action> when" and the conditions it holds. Laid out as the admin's
 * conditions modal row is (a 180 px label, a select 430 px wide), with the inputs under it.
 */
const ConditionActionRow = ({
  action,
  available,
  unavailable,
  value,
  isGrey,
  isReadOnly,
  onChange,
  children,
}: ConditionActionRowProps) => {
  const { formatMessage } = useIntl();
  const actionLabel = formatMessage(ACTION_MESSAGES[action]);
  const can = formatMessage({
    id: 'Settings.permissions.conditions.can',
    defaultMessage: 'Can',
  });
  const when = formatMessage({
    id: 'Settings.permissions.conditions.when',
    defaultMessage: 'When',
  });

  const groups = SOURCES.map(({ source, message }) => ({
    label: formatMessage(message),
    conditions: available
      .filter((condition) => condition.source === source)
      .map((condition) => ({ id: condition.name, label: condition.displayName })),
  }));

  if (unavailable.length > 0) {
    groups.push({
      label: formatMessage({
        id: getTranslation('roles.settings.source.unavailable'),
        defaultMessage: 'Unavailable',
      }),
      conditions: unavailable.map(({ name }) => ({
        id: unavailableName(name),
        label: formatMessage(
          {
            id: getTranslation('roles.settings.unavailable'),
            defaultMessage: 'Unavailable condition {name}',
          },
          { name }
        ),
      })),
    });
  }

  const shownGroups = groups.filter(({ conditions }) => conditions.length > 0);
  const selected = value.map(({ name }) =>
    available.some((condition) => condition.name === name) ? name : unavailableName(name)
  );

  const handleChange = (next: string[] = []) =>
    onChange(
      next.map((id) => (id.startsWith('unavailable:') ? id.slice('unavailable:'.length) : id))
    );

  return (
    <Flex
      tag="li"
      direction="column"
      alignItems="stretch"
      background={isGrey ? 'neutral100' : 'neutral0'}
      paddingBottom={3}
      paddingTop={3}
    >
      <Flex justifyContent="space-evenly">
        <Flex style={{ width: 180 }}>
          <Typography variant="sigma" textColor="neutral600">
            {can}
            &nbsp;
          </Typography>
          <Typography variant="sigma" title={actionLabel} textColor="primary600" ellipsis>
            {actionLabel}
          </Typography>
          <Typography variant="sigma" textColor="neutral600">
            &nbsp;
            {when}
          </Typography>
        </Flex>
        <Box style={{ maxWidth: 430, width: '100%' }}>
          {isReadOnly ? (
            <Flex direction="column" alignItems="flex-start" gap={3}>
              {selected.length === 0 ? (
                <Typography textColor="neutral600">
                  {formatMessage({
                    id: 'Settings.permissions.conditions.none-applied',
                    defaultMessage: 'No conditions applied.',
                  })}
                </Typography>
              ) : (
                shownGroups.map(({ label, conditions }) => {
                  const chosen = conditions.filter(({ id }) => selected.includes(id));

                  if (chosen.length === 0) {
                    return null;
                  }

                  return (
                    <Flex key={label} direction="column" alignItems="flex-start" gap={2}>
                      <Typography variant="pi" fontWeight="bold" textColor="neutral600">
                        {label}
                      </Typography>
                      <Typography variant="omega" textColor="neutral800">
                        {chosen.map((condition) => condition.label).join(', ')}
                      </Typography>
                    </Flex>
                  );
                })
              )}
            </Flex>
          ) : (
            <MultiSelect
              aria-label={`${can} ${actionLabel} ${when}`}
              placeholder={formatMessage({
                id: 'Settings.permissions.conditions.anytime',
                defaultMessage: 'Anytime',
              })}
              customizeContent={(values = []) =>
                formatMessage(
                  {
                    id: getTranslation('roles.settings.selected'),
                    defaultMessage: '{count} currently selected',
                  },
                  { count: values.length }
                )
              }
              onChange={handleChange}
              value={selected}
            >
              {shownGroups.map(({ label, conditions }) => (
                <MultiSelectGroup key={label} label={label} values={conditions.map(({ id }) => id)}>
                  {conditions.map(({ id, label: optionLabel }) => (
                    <MultiSelectOption key={id} value={id}>
                      {optionLabel}
                    </MultiSelectOption>
                  ))}
                </MultiSelectGroup>
              ))}
            </MultiSelect>
          )}
        </Box>
      </Flex>
      {!isReadOnly && children}
    </Flex>
  );
};

export { ConditionActionRow };
export type { ConditionActionRowProps };
