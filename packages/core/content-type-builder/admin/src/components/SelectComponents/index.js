/**
 *
 * SelectComponents
 *
 */

import React from 'react';

import { MultiSelectNested } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import useDataManager from '../../hooks/useDataManager';
import { getTrad } from '../../utils';
import findAttribute from '../../utils/findAttribute';

const SelectComponents = ({ dynamicZoneTarget, intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const { componentsGroupedByCategory, modifiedData } = useDataManager();
  const dzSchema =
    findAttribute(modifiedData.contentType.schema.attributes, dynamicZoneTarget) || {};
  const alreadyUsedComponents = dzSchema.components || [];
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
    {}
  );
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
    { number: value?.length ?? 0 }
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

SelectComponents.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  dynamicZoneTarget: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array.isRequired,
};

export default SelectComponents;
