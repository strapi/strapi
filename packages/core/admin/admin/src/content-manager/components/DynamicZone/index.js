import React, { memo, useMemo, useState } from 'react';
import get from 'lodash/get';
import isEqual from 'react-fast-compare';
import PropTypes from 'prop-types';
import { Box, Stack, VisuallyHidden } from '@strapi/design-system';
import { NotAllowedInput, useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

import connect from './utils/connect';
import select from './utils/select';

import DynamicZoneComponent from './components/DynamicComponent';
import AddComponentButton from './components/AddComponentButton';
import DynamicZoneLabel from './components/DynamicZoneLabel';
import ComponentPicker from './components/ComponentPicker';

import { useContentTypeLayout } from '../../hooks';

const DynamicZone = ({
  name,
  // Passed with the select function
  addComponentToDynamicZone,
  formErrors,
  isCreatingEntry,
  isFieldAllowed,
  isFieldReadable,
  labelAction,
  moveComponentField,
  removeComponentFromDynamicZone,
  dynamicDisplayedComponents,
  fieldSchema,
  metadatas,
}) => {
  const [addComponentIsOpen, setAddComponentIsOpen] = useState(false);
  const [liveText, setLiveText] = useState('');

  const { formatMessage } = useIntl();

  const toggleNotification = useNotification();
  const { getComponentLayout, components } = useContentTypeLayout();

  const dynamicDisplayedComponentsLength = dynamicDisplayedComponents.length;
  const intlDescription = metadatas.description
    ? { id: metadatas.description, defaultMessage: metadatas.description }
    : null;

  // We cannot use the default props here
  const { max = Infinity, min = -Infinity } = fieldSchema;
  const dynamicZoneErrors = useMemo(() => {
    return Object.keys(formErrors)
      .filter((key) => {
        return key === name;
      })
      .map((key) => formErrors[key]);
  }, [formErrors, name]);

  const missingComponentNumber = min - dynamicDisplayedComponentsLength;
  const hasError = dynamicZoneErrors.length > 0;

  const hasMinError =
    dynamicZoneErrors.length > 0 && get(dynamicZoneErrors, [0, 'id'], '').includes('min');

  const hasMaxError =
    hasError && get(dynamicZoneErrors, [0, 'id'], '') === 'components.Input.error.validation.max';

  const handleAddComponent = (componentUid) => {
    setAddComponentIsOpen(false);

    const componentLayoutData = getComponentLayout(componentUid);

    addComponentToDynamicZone(name, componentLayoutData, components, hasError);
  };

  const handleClickOpenPicker = () => {
    if (dynamicDisplayedComponentsLength < max) {
      setAddComponentIsOpen((prev) => !prev);
    } else {
      toggleNotification({
        type: 'info',
        message: { id: getTrad('components.notification.info.maximum-requirement') },
      });
    }
  };

  const handleMoveComponent = (newIndex, currentIndex) => {
    setLiveText(
      formatMessage(
        {
          id: getTrad('dnd.reorder'),
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: `${name}.${currentIndex}`,
          position: getItemPos(newIndex),
        }
      )
    );

    moveComponentField({
      name,
      newIndex,
      currentIndex,
    });
  };

  /**
   *
   * @param {number} index
   * @returns {string}
   */
  const getItemPos = (index) => `${index + 1} of ${dynamicDisplayedComponents.length}`;

  const handleCancel = (index) => {
    setLiveText(
      formatMessage(
        {
          id: getTrad('dnd.cancel-item'),
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: `${name}.${index}`,
        }
      )
    );
  };

  const handleGrabItem = (index) => {
    setLiveText(
      formatMessage(
        {
          id: getTrad('dnd.grab-item'),
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropItem = (index) => {
    setLiveText(
      formatMessage(
        {
          id: getTrad('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleRemoveComponent = (name, currentIndex) => () => {
    removeComponentFromDynamicZone(name, currentIndex);
  };

  if (!isFieldAllowed && (isCreatingEntry || (!isFieldReadable && !isCreatingEntry))) {
    return (
      <NotAllowedInput
        description={intlDescription}
        intlLabel={{ id: metadatas.label, defaultMessage: metadatas.label }}
        labelAction={labelAction}
        name={name}
      />
    );
  }

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Stack spacing={6}>
      {dynamicDisplayedComponentsLength > 0 && (
        <Box>
          <DynamicZoneLabel
            intlDescription={intlDescription}
            label={metadatas.label}
            labelAction={labelAction}
            name={name}
            numberOfComponents={dynamicDisplayedComponentsLength}
            required={fieldSchema.required || false}
          />
          <VisuallyHidden id={ariaDescriptionId}>
            {formatMessage({
              id: getTrad('dnd.instructions'),
              defaultMessage: `Press spacebar to grab and re-order`,
            })}
          </VisuallyHidden>
          <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
          <ol aria-describedby={ariaDescriptionId}>
            {dynamicDisplayedComponents.map(({ componentUid, id }, index) => (
              <DynamicZoneComponent
                componentUid={componentUid}
                formErrors={formErrors}
                key={`${componentUid}-${id}`}
                index={index}
                isFieldAllowed={isFieldAllowed}
                name={name}
                onMoveComponent={handleMoveComponent}
                onRemoveComponentClick={handleRemoveComponent(name, index)}
                onCancel={handleCancel}
                onDropItem={handleDropItem}
                onGrabItem={handleGrabItem}
              />
            ))}
          </ol>
        </Box>
      )}

      <AddComponentButton
        hasError={hasError}
        hasMaxError={hasMaxError}
        hasMinError={hasMinError}
        isDisabled={!isFieldAllowed}
        label={metadatas.label}
        missingComponentNumber={missingComponentNumber}
        isOpen={addComponentIsOpen}
        name={name}
        onClick={handleClickOpenPicker}
      />
      <ComponentPicker
        isOpen={addComponentIsOpen}
        components={fieldSchema.components ?? []}
        onClickAddComponent={handleAddComponent}
      />
    </Stack>
  );
};

DynamicZone.defaultProps = {
  dynamicDisplayedComponents: [],
  fieldSchema: {
    max: Infinity,
    min: -Infinity,
  },
  labelAction: null,
};

DynamicZone.propTypes = {
  addComponentToDynamicZone: PropTypes.func.isRequired,
  dynamicDisplayedComponents: PropTypes.arrayOf(
    PropTypes.shape({
      componentUid: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
    })
  ),
  fieldSchema: PropTypes.shape({
    components: PropTypes.array.isRequired,
    max: PropTypes.number,
    min: PropTypes.number,
    required: PropTypes.bool,
  }),
  formErrors: PropTypes.object.isRequired,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  isFieldReadable: PropTypes.bool.isRequired,
  labelAction: PropTypes.element,
  metadatas: PropTypes.shape({
    description: PropTypes.string,
    label: PropTypes.string,
  }).isRequired,
  moveComponentField: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
};

const Memoized = memo(DynamicZone, isEqual);

export default connect(Memoized, select);

export { DynamicZone };
