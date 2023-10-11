/**
 *
 * SelectComponents
 *
 */

import { MultiSelectNested } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Component } from '../contexts/DataManagerContext';
import { useDataManager } from '../hooks/useDataManager';
import { getTrad } from '../utils';
import findAttribute from '../utils/findAttribute';

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
};

export const SelectComponents = ({
  dynamicZoneTarget,
  intlLabel,
  name,
  onChange,
  value,
}: SelectComponentsProps) => {
  const { formatMessage } = useIntl();
  const { componentsGroupedByCategory, modifiedData } = useDataManager();
  const dzSchema =
    findAttribute(modifiedData.contentType.schema.attributes, dynamicZoneTarget) || {};
  const alreadyUsedComponents = dzSchema.components || [];
  const filteredComponentsGroupedByCategory = Object.keys(componentsGroupedByCategory).reduce<
    Component | object
  >((acc, current) => {
    const filteredComponents = componentsGroupedByCategory[current].filter(({ uid }) => {
      return !alreadyUsedComponents.includes(uid);
    });

    if (filteredComponents.length > 0) {
      acc[current] = filteredComponents;
    }

    return acc;
  }, {});
  const options = Object.entries(filteredComponentsGroupedByCategory).reduce((acc, current) => {
    const [categoryName, components] = current;
    const section = {
      label: categoryName,
      children: components.map(({ uid, schema: { displayName } }) => {
        return { label: displayName, value: uid };
      }),
    };

    acc.push(section);

    return acc;
  }, []);

  const displayedValue = formatMessage(
    {
      id: getTrad('components.SelectComponents.displayed-value'),
      defaultMessage:
        '{number, plural, =0 {# components} one {# component} other {# components}} selected',
    },
    { number: value.length }
  );

  return (
    <MultiSelectNested
      id="select1"
      label={formatMessage(intlLabel)}
      customizeContent={() => displayedValue}
      name={name}
      onChange={(values) => {
        onChange({ target: { name, value: values, type: 'select-components' } });
      }}
      options={options}
      value={value || []}
    />
  );
};
