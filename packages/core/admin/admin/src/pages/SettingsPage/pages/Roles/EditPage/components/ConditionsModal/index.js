import React, { useMemo, useState } from 'react';

import {
  Button,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { Breadcrumbs, Crumb } from '@strapi/design-system/v2';
import produce from 'immer';
import get from 'lodash/get';
import groupBy from 'lodash/groupBy';
import upperFirst from 'lodash/upperFirst';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { usePermissionsDataManager } from '../../../../../../../hooks';

import ActionRow from './ActionRow';
import createDefaultConditionsForm from './utils/createDefaultConditionsForm';

const ConditionsModal = ({ actions, headerBreadCrumbs, isFormDisabled, onClosed, onToggle }) => {
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
      produce((draft) => {
        if (!draft[name]) {
          draft[name] = {};
        }

        if (!draft[name].default) {
          draft[name].default = {};
        }

        draft[name].default = values;
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

  return (
    <ModalLayout labelledBy="condition-modal-breadcrumbs" onClose={onClosed}>
      <ModalHeader>
        <Breadcrumbs id="condition-modal-breadcrumbs" label={headerBreadCrumbs.join(', ')}>
          {headerBreadCrumbs.map((label, index, arr) => (
            <Crumb isCurrent={index === arr.length - 1} key={label}>
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
      <ModalBody>
        {actionsToDisplay.length === 0 && (
          <Typography>
            {formatMessage({
              id: 'Settings.permissions.conditions.no-actions',
              defaultMessage:
                'You first need to select actions (create, read, update, ...) before defining conditions on them.',
            })}
          </Typography>
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
      </ModalBody>
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
  isFormDisabled: PropTypes.bool.isRequired,
  onClosed: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default ConditionsModal;
