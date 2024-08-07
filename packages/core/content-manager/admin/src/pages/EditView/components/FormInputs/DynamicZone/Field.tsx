import * as React from 'react';

import {
  createContext,
  InputProps,
  useField,
  useForm,
  useNotification,
} from '@strapi/admin/strapi-admin';
import { Box, Flex, VisuallyHidden } from '@strapi/design-system';
import pipe from 'lodash/fp/pipe';
import { useIntl } from 'react-intl';

import { useDoc } from '../../../../../hooks/useDocument';
import { type EditFieldLayout } from '../../../../../hooks/useDocumentLayout';
import { getTranslation } from '../../../../../utils/translations';
import { transformDocument } from '../../../utils/data';
import { createDefaultForm } from '../../../utils/forms';
import { ComponentProvider, useComponent } from '../ComponentContext';

import { AddComponentButton } from './AddComponentButton';
import { ComponentPicker } from './ComponentPicker';
import { DynamicComponent, DynamicComponentProps } from './DynamicComponent';
import { DynamicZoneLabel, DynamicZoneLabelProps } from './DynamicZoneLabel';

import type { Schema } from '@strapi/types';

interface DynamicZoneContextValue {
  isInDynamicZone: boolean;
}

const [DynamicZoneProvider, useDynamicZone] = createContext<DynamicZoneContextValue>(
  'DynamicZone',
  {
    isInDynamicZone: false,
  }
);

interface DynamicZoneProps
  extends Omit<Extract<EditFieldLayout, { type: 'dynamiczone' }>, 'size' | 'hint'>,
    Pick<InputProps, 'hint'>,
    Pick<DynamicZoneLabelProps, 'labelAction'> {}

const DynamicZone = ({
  attribute,
  disabled: disabledProp,
  hint,
  label,
  labelAction,
  name,
  required = false,
}: DynamicZoneProps) => {
  // We cannot use the default props here
  const { max = Infinity, min = -Infinity } = attribute ?? {};

  const [addComponentIsOpen, setAddComponentIsOpen] = React.useState(false);
  const [liveText, setLiveText] = React.useState('');
  const { components, isLoading } = useDoc();
  const disabled = disabledProp || isLoading;
  const { addFieldRow, removeFieldRow, moveFieldRow } = useForm(
    'DynamicZone',
    ({ addFieldRow, removeFieldRow, moveFieldRow }) => ({
      addFieldRow,
      removeFieldRow,
      moveFieldRow,
    })
  );

  type DzWithTempKey =
    Schema.Attribute.GetDynamicZoneValue<Schema.Attribute.DynamicZone>[number] & {
      __temp_key__: number;
    };

  const { value = [], error } = useField<Array<DzWithTempKey>>(name);

  const dynamicComponentsByCategory = React.useMemo(() => {
    return attribute.components.reduce<
      NonNullable<DynamicComponentProps['dynamicComponentsByCategory']>
    >((acc, componentUid) => {
      const { category, info } = components[componentUid] ?? { info: {} };

      const component = { uid: componentUid, displayName: info.displayName, icon: info.icon };

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category] = [...acc[category], component];

      return acc;
    }, {});
  }, [attribute.components, components]);

  const { formatMessage } = useIntl();

  const { toggleNotification } = useNotification();

  const dynamicDisplayedComponentsLength = value.length;

  const handleAddComponent = (uid: string, position?: number) => {
    setAddComponentIsOpen(false);

    const schema = components[uid];
    const form = createDefaultForm(schema, components);
    const transformations = pipe(transformDocument(schema, components), (data) => ({
      ...data,
      __component: uid,
    }));

    const data = transformations(form);

    addFieldRow(name, data, position);
  };

  const handleClickOpenPicker = () => {
    if (dynamicDisplayedComponentsLength < max) {
      setAddComponentIsOpen((prev) => !prev);
    } else {
      toggleNotification({
        type: 'info',
        message: formatMessage({
          id: getTranslation('components.notification.info.maximum-requirement'),
        }),
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

    moveFieldRow(name, currentIndex, newIndex);
  };

  const getItemPos = (index: number) => `${index + 1} of ${value.length}`;

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
    removeFieldRow(name, currentIndex);
  };

  const hasError = error !== undefined;

  const renderButtonLabel = () => {
    if (addComponentIsOpen) {
      return formatMessage({ id: 'app.utils.close-label', defaultMessage: 'Close' });
    }

    if (hasError && dynamicDisplayedComponentsLength > max) {
      return formatMessage(
        {
          id: getTranslation(`components.DynamicZone.extra-components`),
          defaultMessage:
            'There {number, plural, =0 {are # extra components} one {is # extra component} other {are # extra components}}',
        },
        {
          number: dynamicDisplayedComponentsLength - max,
        }
      );
    }

    if (hasError && dynamicDisplayedComponentsLength < min) {
      return formatMessage(
        {
          id: getTranslation(`components.DynamicZone.missing-components`),
          defaultMessage:
            'There {number, plural, =0 {are # missing components} one {is # missing component} other {are # missing components}}',
        },
        { number: min - dynamicDisplayedComponentsLength }
      );
    }

    return formatMessage(
      {
        id: getTranslation('components.DynamicZone.add-component'),
        defaultMessage: 'Add a component to {componentName}',
      },
      { componentName: label || name }
    );
  };

  const level = useComponent('DynamicZone', (state) => state.level);

  const ariaDescriptionId = React.useId();

  return (
    <DynamicZoneProvider isInDynamicZone>
      <Flex direction="column" alignItems="stretch" gap={6}>
        {dynamicDisplayedComponentsLength > 0 && (
          <Box>
            <DynamicZoneLabel
              hint={hint}
              label={label}
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
              {value.map((field, index) => (
                <ComponentProvider
                  key={field.__temp_key__}
                  level={level + 1}
                  uid={field.__component}
                  // id is always a number in a dynamic zone.
                  id={field.id as number}
                  type="dynamiczone"
                >
                  <DynamicComponent
                    disabled={disabled}
                    name={name}
                    index={index}
                    componentUid={field.__component}
                    onMoveComponent={handleMoveComponent}
                    onRemoveComponentClick={handleRemoveComponent(name, index)}
                    onCancel={handleCancel}
                    onDropItem={handleDropItem}
                    onGrabItem={handleGrabItem}
                    onAddComponent={handleAddComponent}
                    dynamicComponentsByCategory={dynamicComponentsByCategory}
                  />
                </ComponentProvider>
              ))}
            </ol>
          </Box>
        )}
        <Flex justifyContent="center">
          <AddComponentButton
            hasError={hasError}
            isDisabled={disabled}
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
    </DynamicZoneProvider>
  );
};

export { DynamicZone, useDynamicZone };
export type { DynamicZoneProps };
