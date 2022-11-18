import React, { memo, useCallback, useMemo, useState } from 'react';
/* eslint-disable import/no-cycle */
import { useDrop } from 'react-dnd';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { useNotification } from '@strapi/helper-plugin';
import { Box, Flex, TextButton } from '@strapi/design-system';
import Plus from '@strapi/icons/Plus';
import { getMaxTempKey, getTrad } from '../../utils';
import { useContentTypeLayout } from '../../hooks';
import ItemTypes from '../../utils/ItemTypes';
import ComponentInitializer from '../ComponentInitializer';
import connect from './utils/connect';
import select from './utils/select';
import getComponentErrorKeys from './utils/getComponentErrorKeys';
import DraggedItem from './DraggedItem';
import AccordionGroupCustom from './AccordionGroupCustom';

const TextButtonCustom = styled(TextButton)`
  height: 100%;
  width: 100%;
  border-radius: 0 0 4px 4px;
  display: flex;
  justify-content: center;
  span {
    font-weight: 600;
    font-size: 14px;
  }
`;

const RepeatableComponent = ({
  addRepeatableComponentToField,
  formErrors,
  componentUid,
  componentValue,
  componentValueLength,
  isReadOnly,
  max,
  min,
  name,
}) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [collapseToOpen, setCollapseToOpen] = useState('');
  const [isDraggingSibling, setIsDraggingSibling] = useState(false);
  const [, drop] = useDrop({ accept: ItemTypes.COMPONENT });
  const { getComponentLayout, components } = useContentTypeLayout();
  const componentLayoutData = useMemo(
    () => getComponentLayout(componentUid),
    [componentUid, getComponentLayout]
  );

  const nextTempKey = useMemo(() => {
    return getMaxTempKey(componentValue || []) + 1;
  }, [componentValue]);

  const componentErrorKeys = getComponentErrorKeys(name, formErrors);

  const toggleCollapses = () => {
    setCollapseToOpen('');
  };

  const missingComponentsValue = min - componentValueLength;

  const hasMinError = get(formErrors, name, { id: '' }).id.includes('min');

  const handleClick = useCallback(() => {
    if (!isReadOnly) {
      if (componentValueLength < max) {
        const shouldCheckErrors = hasMinError;

        addRepeatableComponentToField(name, componentLayoutData, components, shouldCheckErrors);

        setCollapseToOpen(nextTempKey);
      } else if (componentValueLength >= max) {
        toggleNotification({
          type: 'info',
          message: { id: getTrad('components.notification.info.maximum-requirement') },
        });
      }
    }
  }, [
    components,
    addRepeatableComponentToField,
    componentLayoutData,
    componentValueLength,
    hasMinError,
    isReadOnly,
    max,
    name,
    nextTempKey,
    toggleNotification,
  ]);

  let errorMessage = formErrors[name];

  if (hasMinError) {
    errorMessage = {
      id: getTrad('components.DynamicZone.missing-components'),
      defaultMessage:
        'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
      values: { number: missingComponentsValue },
    };
  }

  if (componentValueLength === 0) {
    return (
      <ComponentInitializer error={errorMessage} isReadOnly={isReadOnly} onClick={handleClick} />
    );
  }

  const doesRepComponentHasChildError = componentErrorKeys.some(
    (error) => error.split('.').length > 1
  );

  if (doesRepComponentHasChildError && !hasMinError) {
    errorMessage = {
      id: getTrad('components.RepeatableComponent.error-message'),
      defaultMessage: 'The component(s) contain error(s)',
    };
  }

  return (
    <Box hasRadius ref={drop}>
      <AccordionGroupCustom
        error={errorMessage}
        footer={
          <Flex justifyContent="center" height="48px" background="neutral0">
            <TextButtonCustom disabled={isReadOnly} onClick={handleClick} startIcon={<Plus />}>
              {formatMessage({
                id: getTrad('containers.EditView.add.new-entry'),
                defaultMessage: 'Add an entry',
              })}
            </TextButtonCustom>
          </Flex>
        }
      >
        {componentValue.map((data, index) => {
          const key = data.__temp_key__;
          const isOpen = collapseToOpen === key;
          const componentFieldName = `${name}.${index}`;
          const hasErrors = componentErrorKeys.includes(componentFieldName);

          return (
            <DraggedItem
              componentFieldName={componentFieldName}
              componentUid={componentUid}
              hasErrors={hasErrors}
              hasMinError={hasMinError}
              isDraggingSibling={isDraggingSibling}
              isOpen={isOpen}
              isReadOnly={isReadOnly}
              key={key}
              onClickToggle={() => {
                if (isOpen) {
                  setCollapseToOpen('');
                } else {
                  setCollapseToOpen(key);
                }
              }}
              parentName={name}
              schema={componentLayoutData}
              setIsDraggingSibling={setIsDraggingSibling}
              toggleCollapses={toggleCollapses}
            />
          );
        })}
      </AccordionGroupCustom>
    </Box>
  );
};

RepeatableComponent.defaultProps = {
  componentValue: null,
  componentValueLength: 0,
  formErrors: {},
  max: Infinity,
  min: 0,
};

RepeatableComponent.propTypes = {
  addRepeatableComponentToField: PropTypes.func.isRequired,
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  componentValueLength: PropTypes.number,
  formErrors: PropTypes.object,
  isReadOnly: PropTypes.bool.isRequired,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
};

const Memoized = memo(RepeatableComponent);

export default connect(Memoized, select);

export { RepeatableComponent };
