import React, { memo, useMemo, useState } from 'react';
import get from 'lodash/get';
import isEqual from 'react-fast-compare';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { NotAllowedInput, useNotification } from '@strapi/helper-plugin';

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
  moveComponentUp,
  moveComponentDown,
  removeComponentFromDynamicZone,
  dynamicDisplayedComponents,
  fieldSchema,
  metadatas,
}) => {
  const [addComponentIsOpen, setAddComponentIsOpen] = useState(false);

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

  const handleMoveComponentDown = (name, componentIndex) => () => {
    moveComponentDown(name, componentIndex);
  };

  const handleMoveComponentUp = (name, componentIndex) => () => {
    moveComponentUp(name, componentIndex);
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
          {dynamicDisplayedComponents.map((componentUid, index) => {
            const showDownIcon = isFieldAllowed && index < dynamicDisplayedComponentsLength - 1;
            const showUpIcon = isFieldAllowed && index > 0;

            return (
              <DynamicZoneComponent
                componentUid={componentUid}
                formErrors={formErrors}
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                index={index}
                isFieldAllowed={isFieldAllowed}
                onMoveComponentDownClick={handleMoveComponentDown(name, index)}
                onMoveComponentUpClick={handleMoveComponentUp(name, index)}
                name={name}
                onRemoveComponentClick={handleRemoveComponent(name, index)}
                showDownIcon={showDownIcon}
                showUpIcon={showUpIcon}
              />
            );
          })}
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
  dynamicDisplayedComponents: PropTypes.array,
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
  moveComponentUp: PropTypes.func.isRequired,
  moveComponentDown: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
};

const Memoized = memo(DynamicZone, isEqual);

export default connect(Memoized, select);

export { DynamicZone };
