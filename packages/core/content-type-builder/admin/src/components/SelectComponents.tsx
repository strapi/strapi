import { Field, MultiSelectNested } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { MAX_DZ_DEPTH } from '../constants';
import { getTrad } from '../utils';
import { findAttribute } from '../utils/findAttribute';
import { getDzDepth, getMaxDownwardDzDepth } from '../utils/getMaxDepth';

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
  targetUid: Internal.UID.Schema;
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
  const { componentsGroupedByCategory, contentTypes, components, nestedComponents } =
    useDataManager();

  // The DZ may live inside a component (not just a content-type), so check both maps.
  const isTargetAComponent = !!components[targetUid as Internal.UID.Component];
  const schema = isTargetAComponent
    ? components[targetUid as Internal.UID.Component]
    : contentTypes[targetUid as Internal.UID.ContentType];
  const dzSchema = findAttribute(schema?.attributes ?? [], dynamicZoneTarget);

  if (!dzSchema) {
    return null;
  }

  const alreadyUsedComponents = 'components' in dzSchema ? dzSchema?.components : [];

  const filteredComponentsGroupedByCategory = Object.keys(componentsGroupedByCategory).reduce(
    (acc, current) => {
      let filteredComponents = componentsGroupedByCategory[current].filter(({ uid }) => {
        return !alreadyUsedComponents.includes(uid);
      });

      // When the DZ lives inside a component, exclude candidates whose downward
      // DZ depth would exceed MAX_DZ_DEPTH when combined with the current depth.
      if (isTargetAComponent) {
        const currentDzDepth = getDzDepth(targetUid, nestedComponents);
        // Budget remaining for DZ nesting below the candidate (+1 for the edge we're creating).
        const remainingBudget = MAX_DZ_DEPTH - currentDzDepth - 1;

        filteredComponents = filteredComponents.filter(({ uid }) => {
          return (
            getMaxDownwardDzDepth(uid as Internal.UID.Component, components) <= remainingBudget
          );
        });
      }

      if (filteredComponents.length > 0) {
        acc[current] = filteredComponents;
      }

      return acc;
    },
    {} as Record<string, Component[]>
  );
  const options = Object.entries(filteredComponentsGroupedByCategory).reduce(
    (acc, current) => {
      const [categoryName, categoryComponents] = current;
      const section = {
        label: categoryName,
        children: categoryComponents.map(({ uid, info: { displayName } }) => {
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
