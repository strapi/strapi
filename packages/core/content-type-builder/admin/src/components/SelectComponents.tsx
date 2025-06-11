import { Field, MultiSelectNested } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils';
import { findAttribute } from '../utils/findAttribute';

import { useDataManager } from './DataManager/useDataManager';

import type { Component } from '../types';
import type { Internal } from '@strapi/types';

type SelectComponentsProps = {
  dynamicZoneTarget: string;
  intlLabel: {
    id: string;
    defaultMessage: string;
    values?: object;
  };
  name: string;
  onChange: (value: {
    target: {
      name: string;
      value: string[];
      type?: string;
    };
  }) => void;
  value: string[];
  targetUid: Internal.UID.ContentType;
};

export const SelectComponents = ({
  dynamicZoneTarget,
  intlLabel,
  name,
  onChange,
  value,
  targetUid,
}: SelectComponentsProps) => {
  const { formatMessage } = useIntl();
  const { componentsGroupedByCategory, contentTypes } = useDataManager();
  const dzSchema = findAttribute(contentTypes[targetUid].attributes, dynamicZoneTarget);

  if (!dzSchema) {
    return null;
  }

  const alreadyUsedComponents = 'components' in dzSchema ? dzSchema?.components : [];

  const filteredComponentsGroupedByCategory = Object.keys(componentsGroupedByCategory).reduce(
    (acc, current) => {
      const filteredComponents = componentsGroupedByCategory[current].filter(({ uid }) => {
        return !alreadyUsedComponents.includes(uid);
      });

      if (filteredComponents.length > 0) {
        acc[current] = filteredComponents;
      }

      return acc;
    },
    {} as Record<string, Component[]>
  );
  const options = Object.entries(filteredComponentsGroupedByCategory).reduce(
    (acc, current) => {
      const [categoryName, components] = current;
      const section = {
        label: categoryName,
        children: components.map(({ uid, info: { displayName } }) => {
          return { label: displayName, value: uid };
        }),
      };

      acc.push(section);

      return acc;
    },
    [] as Array<{ label: string; children: Array<{ label: string; value: string }> }>
  );

  const displayedValue = formatMessage(
    {
      id: getTrad('components.SelectComponents.displayed-value'),
      defaultMessage:
        '{number, plural, =0 {# components} one {# component} other {# components}} selected',
    },
    { number: value?.length ?? 0 }
  );

  return (
    <Field.Root name={name}>
      <Field.Label>{formatMessage(intlLabel)}</Field.Label>
      <MultiSelectNested
        id="select1"
        customizeContent={() => displayedValue}
        onChange={(values) => {
          onChange({ target: { name, value: values, type: 'select-components' } });
        }}
        options={options}
        value={value || []}
      />
    </Field.Root>
  );
};
