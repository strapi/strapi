import { After } from '@strapi/icons';
import {
  Box,
  Button,
  H2,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Stack,
  Text,
  TextButton,
} from '@strapi/parts';
import { cloneDeep, get, groupBy, set, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import React, { useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';
import { usePermissionsDataManager } from '../../../hooks';
import updateValues from '../Permissions/utils/updateValues';
import ActionRow from './ActionRow';
import createDefaultConditionsForm from './utils/createDefaultConditionsForm';

// ! Something needs to be done in the DS parts to avoid doing this
const Icon = styled(Box)`
  svg {
    width: 6px;
  }
  * {
    fill: ${({ theme }) => theme.colors.neutral300};
  }
`;

const Separator = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.main.colors.brightGrey};
`;

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

  const translatedHeaders = headerBreadCrumbs.map(headerTrad => ({
    key: headerTrad,
    element: <FormattedMessage id={headerTrad} defaultMessage={upperFirst(headerTrad)} />,
  }));

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

  if (!isOpen) return null;

  return (
    <ModalLayout onClose={onClosed}>
      <ModalHeader>
        <Stack horizontal size={3}>
          {translatedHeaders.map(({ key, element }, index) => {
            const shouldDisplayChevron = index < translatedHeaders.length - 1;

            return (
              <>
                <TextButton textColor="neutral800" key={key}>
                  {element}
                </TextButton>
                {shouldDisplayChevron && (
                  <Icon>
                    <After />
                  </Icon>
                )}
              </>
            );
          })}
        </Stack>
      </ModalHeader>
      <Box padding={8}>
        <Stack size={6}>
          <H2>
            {formatMessage({
              id: 'Settings.permissions.conditions.define-conditions',
            })}
          </H2>
          <Separator />
          <Box>
            {actionsToDisplay.length === 0 && (
              <Text>{formatMessage({ id: 'Settings.permissions.conditions.no-actions' })}</Text>
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
          </Box>
        </Stack>
      </Box>
      <ModalFooter
        startActions={
          <Button variant="tertiary" onClick={onToggle}>
            {formatMessage({ id: 'app.components.Button.cancel' })}
          </Button>
        }
        endActions={
          <Button onClick={handleSubmit}>
            {formatMessage({
              id: 'Settings.permissions.conditions.apply',
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
