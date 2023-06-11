import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, VisuallyHidden } from '@strapi/design-system';
import { NotAllowedInput, useNotification, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

import { DynamicComponent } from './components/DynamicComponent';
import { AddComponentButton } from './components/AddComponentButton';
import { DynamicZoneLabel } from './components/DynamicZoneLabel';
import { ComponentPicker } from './components/ComponentPicker';

import { useContentTypeLayout } from '../../hooks';

const DynamicZone = ({ name, labelAction, fieldSchema, metadatas }) => {
  // We cannot use the default props here
  const { max = Infinity, min = -Infinity, components = [], required = false } = fieldSchema;

  const [addComponentIsOpen, setAddComponentIsOpen] = useState(false);
  const [liveText, setLiveText] = useState('');

  const {
    addComponentToDynamicZone,
    createActionAllowedFields,
    isCreatingEntry,
    formErrors,
    modifiedData,
    moveComponentField,
    removeComponentFromDynamicZone,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useCMEditViewDataManager();

  const dynamicDisplayedComponents = useMemo(
    () =>
      (modifiedData?.[name] ?? []).map((data) => {
        return {
          componentUid: data.__component,
          id: data.id ?? data.__temp_key__,
        };
      }),
    [modifiedData, name]
  );

  const { getComponentLayout, components: allComponents } = useContentTypeLayout();

  /**
   * @type {Record<string, Array<{category: string; info: unknown, attributes: Record<string, unknown>}>>}
   */
  const dynamicComponentsByCategory = useMemo(() => {
    return components.reduce((acc, componentUid) => {
      const { category, info, attributes } = getComponentLayout(componentUid);
      const component = { componentUid, info, attributes };

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category] = [...acc[category], component];

      return acc;
    }, {});
  }, [components, getComponentLayout]);

  const { formatMessage } = useIntl();

  const toggleNotification = useNotification();

  const isFieldAllowed = useMemo(() => {
    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return allowedFields.includes(name);
  }, [name, isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const isFieldReadable = useMemo(() => {
    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return allowedFields.includes(name);
  }, [name, isCreatingEntry, readActionAllowedFields]);

  const dynamicDisplayedComponentsLength = dynamicDisplayedComponents.length;
  const intlDescription = metadatas.description
    ? { id: metadatas.description, defaultMessage: metadatas.description }
    : null;

  const dynamicZoneError = formErrors[name];

  const missingComponentNumber = min - dynamicDisplayedComponentsLength;
  const hasError = !!dynamicZoneError;

  const handleAddComponent = (componentUid, position) => {
    setAddComponentIsOpen(false);

    const componentLayoutData = getComponentLayout(componentUid);

    /**
     * You have to pass _every component_ because the EditViewDataManager is not part of redux
     * and you could have a dynamic component option that contains a component that is not part
     * of the former list. Therefore it's schema is inaccessible leading to a crash.
     */
    addComponentToDynamicZone(name, componentLayoutData, allComponents, hasError, position);
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

  const renderButtonLabel = () => {
    if (addComponentIsOpen) {
      return formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' });
    }

    if (hasError && dynamicZoneError.id.includes('max')) {
      return formatMessage({
        id: 'components.Input.error.validation.max',
        defaultMessage: 'The value is too high.',
      });
    }

    if (hasError && dynamicZoneError.id.includes('min')) {
      return formatMessage(
        {
          id: getTrad(`components.DynamicZone.missing-components`),
          defaultMessage:
            'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
        },
        { number: missingComponentNumber }
      );
    }

    return formatMessage(
      {
        id: getTrad('components.DynamicZone.add-component'),
        defaultMessage: 'Add a component to {componentName}',
      },
      { componentName: metadatas.label || name }
    );
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
    <Flex direction="column" alignItems="stretch" gap={6}>
      {dynamicDisplayedComponentsLength > 0 && (
        <Box>
          <DynamicZoneLabel
            intlDescription={intlDescription}
            label={metadatas.label}
            labelAction={labelAction}
            name={name}
            numberOfComponents={dynamicDisplayedComponentsLength}
            required={required}
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
              <DynamicComponent
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
                onAddComponent={handleAddComponent}
                dynamicComponentsByCategory={dynamicComponentsByCategory}
              />
            ))}
          </ol>
        </Box>
      )}
      <Flex justifyContent="center">
        <AddComponentButton
          hasError={hasError}
          isDisabled={!isFieldAllowed}
          isOpen={addComponentIsOpen}
          onClick={handleClickOpenPicker}
        >
          {renderButtonLabel()}
        </AddComponentButton>
      </Flex>
      <ComponentPicker
        dynamicComponentsByCategory={dynamicComponentsByCategory}
        isOpen={addComponentIsOpen}
        onClickAddComponent={handleAddComponent}
      />
    </Flex>
  );
};

DynamicZone.defaultProps = {
  fieldSchema: {},
  labelAction: null,
};

DynamicZone.propTypes = {
  fieldSchema: PropTypes.shape({
    components: PropTypes.array,
    max: PropTypes.number,
    min: PropTypes.number,
    required: PropTypes.bool,
  }),
  labelAction: PropTypes.element,
  metadatas: PropTypes.shape({
    description: PropTypes.string,
    label: PropTypes.string,
  }).isRequired,
  name: PropTypes.string.isRequired,
};

export { DynamicZone };
