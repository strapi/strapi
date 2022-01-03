import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import get from 'lodash/get';
import isEqual from 'react-fast-compare';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import { Box } from '@strapi/design-system/Box';
import { NotAllowedInput, useNotification } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';
import connect from './utils/connect';
import select from './utils/select';
import AddComponentButton from './components/AddComponentButton';
import DzLabel from './components/DzLabel';
import Component from './components/Component';

import ComponentPicker from './components/ComponentPicker';

/* eslint-disable react/no-array-index-key */

const createCollapses = arrayLength =>
  Array.from({ length: arrayLength }).map(() => ({ isOpen: false }));

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
  const toggleNotification = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldOpenAddedComponent, setShouldOpenAddedComponent] = useState(false);
  const dynamicDisplayedComponentsLength = dynamicDisplayedComponents.length;

  const [componentCollapses, setComponentsCollapses] = useState(
    createCollapses(dynamicDisplayedComponentsLength)
  );

  useEffect(() => {
    setComponentsCollapses(createCollapses(dynamicDisplayedComponentsLength));
  }, [dynamicDisplayedComponentsLength]);

  useEffect(() => {
    if (shouldOpenAddedComponent) {
      setComponentsCollapses(prev =>
        prev.map((collapse, index) => {
          if (index === prev.length - 1) {
            return { ...collapse, isOpen: true };
          }

          return collapse;
        })
      );

      setShouldOpenAddedComponent(false);
    }
  }, [shouldOpenAddedComponent]);

  // We cannot use the default props here
  const { max = Infinity, min = -Infinity } = fieldSchema;
  const dynamicZoneErrors = useMemo(() => {
    return Object.keys(formErrors)
      .filter(key => {
        return key === name;
      })
      .map(key => formErrors[key]);
  }, [formErrors, name]);

  const dynamicZoneAvailableComponents = useMemo(() => fieldSchema.components || [], [fieldSchema]);

  const missingComponentNumber = min - dynamicDisplayedComponentsLength;
  const hasError = dynamicZoneErrors.length > 0;

  const hasMinError =
    dynamicZoneErrors.length > 0 && get(dynamicZoneErrors, [0, 'id'], '').includes('min');

  const hasMaxError =
    hasError && get(dynamicZoneErrors, [0, 'id'], '') === 'components.Input.error.validation.max';

  const handleAddComponent = useCallback(
    componentUid => {
      setIsOpen(false);

      addComponentToDynamicZone(name, componentUid, hasError);
      setShouldOpenAddedComponent(true);
    },
    [addComponentToDynamicZone, hasError, name]
  );

  const handleClickOpenPicker = () => {
    if (dynamicDisplayedComponentsLength < max) {
      setIsOpen(prev => !prev);
    } else {
      toggleNotification({
        type: 'info',
        message: { id: getTrad('components.notification.info.maximum-requirement') },
      });
    }
  };

  const handleToggleComponent = indexToToggle => {
    setComponentsCollapses(prev =>
      prev.map(({ isOpen }, index) => {
        if (index === indexToToggle) {
          return { isOpen: !isOpen };
        }

        return { isOpen };
      })
    );
  };

  const handleMoveComponentDown = (name, currentIndex) => {
    moveComponentDown(name, currentIndex);
    setComponentsCollapses(prev => {
      return prev.map(({ isOpen }, index, refArray) => {
        if (index === currentIndex + 1) {
          return { isOpen: refArray[currentIndex].isOpen };
        }

        if (index === currentIndex) {
          return { isOpen: refArray[index + 1].isOpen };
        }

        return { isOpen };
      });
    });
  };

  const handleMoveComponentUp = (name, currentIndex) => {
    moveComponentUp(name, currentIndex);
    setComponentsCollapses(prev => {
      return prev.map(({ isOpen }, index, refArray) => {
        if (index === currentIndex - 1) {
          return { isOpen: refArray[currentIndex].isOpen };
        }

        if (index === currentIndex) {
          return { isOpen: refArray[index - 1].isOpen };
        }

        return { isOpen };
      });
    });
  };

  const handleRemoveComponent = (name, currentIndex) => {
    removeComponentFromDynamicZone(name, currentIndex);
  };

  if (!isFieldAllowed && isCreatingEntry) {
    return (
      <NotAllowedInput
        description={
          metadatas.description
            ? { id: metadatas.description, defaultMessage: metadatas.description }
            : null
        }
        intlLabel={{ id: metadatas.label, defaultMessage: metadatas.label }}
        labelAction={labelAction}
        name={name}
      />
    );
  }

  if (!isFieldAllowed && !isFieldReadable && !isCreatingEntry) {
    return (
      <NotAllowedInput
        description={
          metadatas.description
            ? { id: metadatas.description, defaultMessage: metadatas.description }
            : null
        }
        intlLabel={{ id: metadatas.label, defaultMessage: metadatas.label }}
        labelAction={labelAction}
        name={name}
      />
    );
  }

  return (
    <Stack size={6}>
      {dynamicDisplayedComponentsLength > 0 && (
        <Box>
          <DzLabel
            label={metadatas.label}
            labelAction={labelAction}
            name={name}
            numberOfComponents={dynamicDisplayedComponentsLength}
            required={fieldSchema.required || false}
          />
          {dynamicDisplayedComponents.map((componentUid, index) => {
            const showDownIcon =
              isFieldAllowed &&
              dynamicDisplayedComponentsLength > 0 &&
              index < dynamicDisplayedComponentsLength - 1;
            const showUpIcon = isFieldAllowed && dynamicDisplayedComponentsLength > 0 && index > 0;
            const isOpen = componentCollapses[index]?.isOpen || false;

            return (
              <Component
                componentUid={componentUid}
                formErrors={formErrors}
                key={index}
                index={index}
                isOpen={isOpen}
                isFieldAllowed={isFieldAllowed}
                moveComponentDown={handleMoveComponentDown}
                moveComponentUp={handleMoveComponentUp}
                onToggle={handleToggleComponent}
                name={name}
                removeComponentFromDynamicZone={handleRemoveComponent}
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
        isOpen={isOpen}
        name={name}
        onClick={handleClickOpenPicker}
      />
      <ComponentPicker
        isOpen={isOpen}
        components={dynamicZoneAvailableComponents}
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

export default connect(
  Memoized,
  select
);

export { DynamicZone };
