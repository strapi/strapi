import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get, groupBy, set } from 'lodash';
import { Modal, ModalHeader, ModalFooter } from 'strapi-helper-plugin';
import { Button, Text, Padded } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { usePermissionsDataManager } from '../../../hooks';
import createDefaultConditionsForm from './utils/createDefaultConditionsForm';
import ActionRow from './ActionRow';
import Separator from './Separator';
import updateValues from '../Permissions/utils/updateValues';

const ConditionsModal = ({
  actions,
  headerBreadCrumbs,
  isOpen,
  isFormDisabled,
  onClosed,
  onToggle,
}) => {
  const { formatMessage } = useIntl();
  const { availableConditions, modifiedData, onChangeConditions } = usePermissionsDataManager();

  const arrayOfOptionsGroupedByCategory = useMemo(() => {
    return Object.entries(groupBy(availableConditions, 'category'));
  }, [availableConditions]);

  const actionsToDisplay = actions.filter(
    ({ isDisplayed, hasSomeActionsSelected, hasAllActionsSelected }) =>
      isDisplayed && (hasSomeActionsSelected || hasAllActionsSelected)
  );

  const initState = useMemo(() => {
    return createDefaultConditionsForm(
      actionsToDisplay,
      modifiedData,
      arrayOfOptionsGroupedByCategory
    );
  }, [actionsToDisplay, modifiedData, arrayOfOptionsGroupedByCategory]);

  const [state, setState] = useState(initState);

  const handleCategoryChange = ({ keys, value }) => {
    setState(prevState => {
      const updatedState = cloneDeep(prevState);
      const objToUpdate = get(prevState, keys, {});
      const updatedValues = updateValues(objToUpdate, value);

      set(updatedState, keys, updatedValues);

      return updatedState;
    });
  };

  const handleChange = ({ keys, value }) => {
    setState(prevState => {
      const updatedState = cloneDeep(prevState);

      set(updatedState, keys, value);

      return updatedState;
    });
  };

  const handleSubmit = () => {
    const conditionsWithoutCategory = Object.entries(state).reduce((acc, current) => {
      const [key, value] = current;

      const merged = Object.values(value).reduce((acc1, current1) => {
        return { ...acc1, ...current1 };
      }, {});

      acc[key] = merged;

      return acc;
    }, {});

    onChangeConditions(conditionsWithoutCategory);
    onToggle();
  };

  return (
    <Modal withoverflow="true" onClosed={onClosed} isOpen={isOpen} onToggle={onToggle}>
      <ModalHeader headerBreadcrumbs={headerBreadCrumbs} />
      <Padded top left right bottom size="md">
        <Text fontSize="lg" fontWeight="bold">
          {formatMessage({
            id: 'Settings.permissions.conditions.define-conditions',
          })}
        </Text>
        <Separator />
        {actionsToDisplay.length === 0 && (
          <Text fontSize="md" color="grey">
            {formatMessage({ id: 'Settings.permissions.conditions.no-actions' })}
          </Text>
        )}
        {actionsToDisplay.map(({ actionId, label, pathToConditionsObject }, index) => {
          const name = pathToConditionsObject.join('..');

          return (
            <ActionRow
              key={actionId}
              arrayOfOptionsGroupedByCategory={arrayOfOptionsGroupedByCategory}
              label={label}
              isFormDisabled={isFormDisabled}
              isGrey={index % 2 === 0}
              name={name}
              onCategoryChange={handleCategoryChange}
              onChange={handleChange}
              value={get(state, name, {})}
            />
          );
        })}
      </Padded>
      <ModalFooter>
        <section>
          <Button type="button" color="cancel" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>

          <Button type="button" color="success" onClick={handleSubmit}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
            })}
          </Button>
        </section>
      </ModalFooter>
    </Modal>
  );
};

ConditionsModal.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      actionId: PropTypes.string.isRequired,
      checkboxName: PropTypes.string,
      hasSomeActionsSelected: PropTypes.bool.isRequired,
      hasAllActionsSelected: PropTypes.bool,
      isDisplayed: PropTypes.bool.isRequired,
      label: PropTypes.string,
    })
  ).isRequired,
  headerBreadCrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  onClosed: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ConditionsModal;
