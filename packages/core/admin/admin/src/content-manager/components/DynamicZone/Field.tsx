import * as React from 'react';

import { Box, Flex, VisuallyHidden } from '@strapi/design-system';
import { NotAllowedInput, useCMEditViewDataManager, useNotification } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useContentTypeLayout } from '../../hooks/useContentTypeLayout';
import { getTranslation } from '../../utils/translations';

import { AddComponentButton } from './AddComponentButton';
import { ComponentPicker } from './ComponentPicker';
import { DynamicComponent, DynamicComponentProps } from './DynamicComponent';
import { DynamicZoneLabel } from './DynamicZoneLabel';

import type { EditLayoutRow } from '../../utils/layouts';
import type { Attribute } from '@strapi/types';

interface DynamicZoneProps extends Pick<EditLayoutRow, 'metadatas'> {
  name: string;
  fieldSchema?: Attribute.DynamicZone;
  labelAction?: React.ReactNode;
}

const DynamicZone = ({ name, labelAction, fieldSchema, metadatas }: DynamicZoneProps) => {
  // We cannot use the default props here
  const { max = Infinity, min = -Infinity, components = [], required = false } = fieldSchema ?? {};

  const [addComponentIsOpen, setAddComponentIsOpen] = React.useState(false);
  const [liveText, setLiveText] = React.useState('');

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

  const dynamicDisplayedComponents = React.useMemo(
    () =>
      ((modifiedData?.[name] as []) ?? []).map(
        (data: Attribute.GetValue<Attribute.DynamicZone>[number] & { __temp_key__: number }) => {
          return {
            componentUid: data.__component,
            id: data.id ?? data.__temp_key__,
          };
        }
      ),
    [modifiedData, name]
  );

  const { getComponentLayout, components: allComponents } = useContentTypeLayout();

  const dynamicComponentsByCategory = React.useMemo(() => {
    return components.reduce<NonNullable<DynamicComponentProps['dynamicComponentsByCategory']>>(
      (acc, componentUid) => {
        const layout = getComponentLayout(componentUid);

        const { category, info, attributes } = layout;

        const component = { componentUid, info, attributes };

        if (!acc[category]) {
          acc[category] = [];
        }

        acc[category] = [...acc[category], component];

        return acc;
      },
      {}
    );
  }, [components, getComponentLayout]);

  const { formatMessage } = useIntl();

  const toggleNotification = useNotification();

  const isFieldAllowed = (
    isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields
  ).includes(name);

  const isFieldReadable = (isCreatingEntry ? [] : readActionAllowedFields).includes(name);

  const dynamicDisplayedComponentsLength = dynamicDisplayedComponents.length;
  const intlDescription = metadatas.description
    ? { id: metadatas.description, defaultMessage: metadatas.description }
    : undefined;

  const dynamicZoneError = formErrors[name];

  const missingComponentNumber = min - dynamicDisplayedComponentsLength;
  const hasError = !!dynamicZoneError;

  const handleAddComponent = (componentUid: string, position?: number) => {
    setAddComponentIsOpen(false);

    const componentLayoutData = getComponentLayout(componentUid);

    /**
     * You have to pass _every component_ because the EditViewDataManager is not part of redux
     * and you could have a dynamic component option that contains a component that is not part
     * of the former list. Therefore it's schema is inaccessible leading to a crash.
     */
    addComponentToDynamicZone?.(name, componentLayoutData, allComponents, hasError, position);
  };

  const handleClickOpenPicker = () => {
    if (dynamicDisplayedComponentsLength < max) {
      setAddComponentIsOpen((prev) => !prev);
    } else {
      toggleNotification({
        type: 'info',
        message: { id: getTranslation('components.notification.info.maximum-requirement') },
      });
    }
  };

  const handleMoveComponent = (newIndex: number, currentIndex: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.reorder'),
          defaultMessage: '{item}, moved. New position in list: {position}.',
        },
        {
          item: `${name}.${currentIndex}`,
          position: getItemPos(newIndex),
        }
      )
    );

    moveComponentField?.({
      name,
      newIndex,
      currentIndex,
    });
  };

  const getItemPos = (index: number) => `${index + 1} of ${dynamicDisplayedComponents.length}`;

  const handleCancel = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.cancel-item'),
          defaultMessage: '{item}, dropped. Re-order cancelled.',
        },
        {
          item: `${name}.${index}`,
        }
      )
    );
  };

  const handleGrabItem = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.grab-item'),
          defaultMessage: `{item}, grabbed. Current position in list: {position}. Press up and down arrow to change position, Spacebar to drop, Escape to cancel.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleDropItem = (index: number) => {
    setLiveText(
      formatMessage(
        {
          id: getTranslation('dnd.drop-item'),
          defaultMessage: `{item}, dropped. Final position in list: {position}.`,
        },
        {
          item: `${name}.${index}`,
          position: getItemPos(index),
        }
      )
    );
  };

  const handleRemoveComponent = (name: string, currentIndex: number) => () => {
    removeComponentFromDynamicZone?.(name, currentIndex);
  };

  const renderButtonLabel = () => {
    if (addComponentIsOpen) {
      return formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' });
    }

    if (hasError && dynamicZoneError.id?.includes('max')) {
      return formatMessage({
        id: 'components.Input.error.validation.max',
        defaultMessage: 'The value is too high.',
      });
    }

    if (hasError && dynamicZoneError.id?.includes('min')) {
      return formatMessage(
        {
          id: getTranslation(`components.DynamicZone.missing-components`),
          defaultMessage:
            'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
        },
        { number: missingComponentNumber }
      );
    }

    return formatMessage(
      {
        id: getTranslation('components.DynamicZone.add-component'),
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
              id: getTranslation('dnd.instructions'),
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
export type { DynamicZoneProps };
