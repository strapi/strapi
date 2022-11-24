/* eslint-disable import/no-cycle */
import React, { memo, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import get from 'lodash/get';

import { useNotification, useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box, Flex, TextButton, VisuallyHidden } from '@strapi/design-system';
import { Plus } from '@strapi/icons';

import { getMaxTempKey, getTrad } from '../../utils';
import { useContentTypeLayout } from '../../hooks';

import ComponentInitializer from '../ComponentInitializer';
import Component from './components/Component';
import * as Accordion from './components/Accordion';

import getComponentErrorKeys from './utils/getComponentErrorKeys';

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
  componentUid,
  componentValue,
  componentValueLength,
  isReadOnly,
  max,
  min,
  name,
}) => {
  const { addRepeatableComponentToField, formErrors, moveComponentField } =
    useCMEditViewDataManager();
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const [collapseToOpen, setCollapseToOpen] = useState('');
  const [liveText, setLiveText] = useState('');
  const { getComponentLayout, components } = useContentTypeLayout();
  const componentLayoutData = useMemo(
    () => getComponentLayout(componentUid),
    [componentUid, getComponentLayout]
  );

  const nextTempKey = useMemo(() => {
    return getMaxTempKey(componentValue || []) + 1;
  }, [componentValue]);

  const componentErrorKeys = getComponentErrorKeys(name, formErrors);

  const missingComponentsValue = min - componentValueLength;

  const hasMinError = get(formErrors, name, { id: '' }).id.includes('min');

  const toggleCollapses = () => {
    setCollapseToOpen('');
  };

  const handleClick = () => {
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
  };

  const handleMoveComponentField = (newIndex, currentIndex) => {
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

  const mainField = get(componentLayoutData, ['settings', 'mainField'], 'id');

  const handleToggle = (key) => () => {
    if (collapseToOpen === key) {
      setCollapseToOpen('');
    } else {
      setCollapseToOpen(key);
    }
  };

  /**
   *
   * @param {number} index
   * @returns {string}
   */
  const getItemPos = (index) => `${index + 1} of ${componentValueLength}`;

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

  let errorMessage = formErrors[name];

  if (hasMinError) {
    errorMessage = {
      id: getTrad('components.DynamicZone.missing-components'),
      defaultMessage:
        'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
      values: { number: missingComponentsValue },
    };
  } else if (componentErrorKeys.some((error) => error.split('.').length > 1) && !hasMinError) {
    errorMessage = {
      id: getTrad('components.RepeatableComponent.error-message'),
      defaultMessage: 'The component(s) contain error(s)',
    };
  }

  if (componentValueLength === 0) {
    return (
      <ComponentInitializer error={errorMessage} isReadOnly={isReadOnly} onClick={handleClick} />
    );
  }

  const ariaDescriptionId = `${name}-item-instructions`;

  return (
    <Box hasRadius>
      <VisuallyHidden id={ariaDescriptionId}>
        {formatMessage({
          id: getTrad('dnd.instructions'),
          defaultMessage: `Press spacebar to grab and re-order`,
        })}
      </VisuallyHidden>
      <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
      <Accordion.Group error={errorMessage} ariaDescribedBy={ariaDescriptionId}>
        <Accordion.Content aria-describedby={ariaDescriptionId}>
          {componentValue.map((data, index) => {
            const key = data.__temp_key__;
            const componentFieldName = `${name}.${index}`;

            return (
              <Component
                componentFieldName={componentFieldName}
                componentUid={componentUid}
                fields={componentLayoutData.layouts.edit}
                key={key}
                index={index}
                isOpen={collapseToOpen === key}
                isReadOnly={isReadOnly}
                mainField={mainField}
                moveComponentField={handleMoveComponentField}
                onClickToggle={handleToggle(key)}
                toggleCollapses={toggleCollapses}
                onCancel={handleCancel}
                onDropItem={handleDropItem}
                onGrabItem={handleGrabItem}
              />
            );
          })}
        </Accordion.Content>
        <Accordion.Footer>
          <Flex justifyContent="center" height="48px" background="neutral0">
            <TextButtonCustom disabled={isReadOnly} onClick={handleClick} startIcon={<Plus />}>
              {formatMessage({
                id: getTrad('containers.EditView.add.new-entry'),
                defaultMessage: 'Add an entry',
              })}
            </TextButtonCustom>
          </Flex>
        </Accordion.Footer>
      </Accordion.Group>
    </Box>
  );
};

RepeatableComponent.defaultProps = {
  componentValue: null,
  componentValueLength: 0,
  isReadOnly: false,
  max: Infinity,
  min: 0,
};

RepeatableComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  componentValueLength: PropTypes.number,
  isReadOnly: PropTypes.bool,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
};

export default memo(RepeatableComponent);

export { RepeatableComponent };
