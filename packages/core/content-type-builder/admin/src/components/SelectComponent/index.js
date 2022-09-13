/**
 *
 * SelectComponent
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Select, Option } from '@strapi/design-system/Select';
import useDataManager from '../../hooks/useDataManager';

const SelectComponent = ({
  error,
  intlLabel,
  isAddingAComponentToAnotherComponent,
  isCreating,
  isCreatingComponentWhileAddingAField,
  componentToCreate,
  name,
  onChange,
  targetUid,
  forTarget,
  value,
}) => {
  const { formatMessage } = useIntl();
  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  const { componentsGroupedByCategory, componentsThatHaveOtherComponentInTheirAttributes } =
    useDataManager();

  const isTargetAComponent = ['component', 'components'].includes(forTarget);

  let options = Object.entries(componentsGroupedByCategory).reduce((acc, current) => {
    const [categoryName, components] = current;
    const compos = components.map((component) => {
      return {
        uid: component.uid,
        label: component.schema.displayName,
        categoryName,
      };
    });

    return [...acc, ...compos];
  }, []);

  if (isAddingAComponentToAnotherComponent) {
    options = options.filter((option) => {
      return !componentsThatHaveOtherComponentInTheirAttributes.includes(option.uid);
    });
  }

  if (isTargetAComponent) {
    options = options.filter((option) => {
      return option.uid !== targetUid;
    });
  }

  if (isCreatingComponentWhileAddingAField) {
    options = [
      {
        uid: value,
        label: componentToCreate.displayName,
        categoryName: componentToCreate.category,
      },
    ];
  }

  return (
    <Select
      disabled={isCreatingComponentWhileAddingAField || !isCreating}
      error={errorMessage}
      label={label}
      id={name}
      name={name}
      onChange={(value) => {
        onChange({ target: { name, value, type: 'select-category' } });
      }}
      value={value || ''}
    >
      {options.map((option) => {
        return (
          <Option key={option.uid} value={option.uid}>
            {`${option.categoryName} - ${option.label}`}
          </Option>
        );
      })}
    </Select>
  );
};

SelectComponent.defaultProps = {
  componentToCreate: null,
  error: null,
};

SelectComponent.propTypes = {
  componentToCreate: PropTypes.object,
  forTarget: PropTypes.string.isRequired,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  isAddingAComponentToAnotherComponent: PropTypes.bool.isRequired,
  isCreating: PropTypes.bool.isRequired,
  isCreatingComponentWhileAddingAField: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  targetUid: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

export default SelectComponent;
