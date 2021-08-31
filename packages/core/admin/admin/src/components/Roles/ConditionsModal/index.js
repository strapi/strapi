import {
  Box,
  Breadcrumbs,
  Button,
  Crumb,
  Divider,
  H2,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Stack,
  Text,
} from '@strapi/parts';
import produce from 'immer';
import { get, groupBy, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { usePermissionsDataManager } from '../../../hooks';
import ActionRow from './ActionRow';
import createDefaultConditionsForm from './utils/createDefaultConditionsForm';

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

  const handleChange = (name, values) => {
    setState(
      produce(draft => {
        Object.entries(draft[name].default).forEach(([key]) => {
          draft[name].default[key] = values.includes(key);
        });
      })
    );
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

  if (!isOpen) return null;

  return (
    <ModalLayout onClose={onClosed}>
      <ModalHeader>
        <Breadcrumbs label={headerBreadCrumbs.join(', ')}>
          {headerBreadCrumbs.map(label => (
            <Crumb key={label}>
              {upperFirst(
                formatMessage({
                  id: label,
                  defaultMessage: label,
                })
              )}
            </Crumb>
          ))}
        </Breadcrumbs>
      </ModalHeader>
      <Box padding={8}>
        <Stack size={6}>
          <H2>
            {formatMessage({
              id: 'Settings.permissions.conditions.define-conditions',
              defaultMessage: 'Define conditions',
            })}
          </H2>
          <Box>
            <Divider />
          </Box>
          <Box>
            {actionsToDisplay.length === 0 && (
              <Text>
                {formatMessage({
                  id: 'Settings.permissions.conditions.no-actions',
                  defaultMessage:
                    'You first need to select actions (create, read, update, ...) before defining conditions on them.',
                })}
              </Text>
            )}
            <ul>
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
                    onChange={handleChange}
                    value={get(state, name, {})}
                  />
                );
              })}
            </ul>
          </Box>
        </Stack>
      </Box>
      <ModalFooter
        startActions={
          <Button variant="tertiary" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <Button onClick={handleSubmit}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
              defaultMessage: 'Apply',
            })}
          </Button>
        }
      />
    </ModalLayout>
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
