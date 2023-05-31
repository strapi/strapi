import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { GridItem, Select, Option } from '@strapi/design-system';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import { useLayoutDnd } from '../hooks/useLayoutDnd';
import { createPossibleMainFieldsForModelsAndComponents, getInputProps } from '../utils';
import { makeSelectModelAndComponentSchemas, selectFieldSizes } from '../../App/selectors';
import getTrad from '../../../utils/getTrad';
import GenericInput from './GenericInput';

const FIELD_SIZES = [
  [4, '33%'],
  [6, '50%'],
  [8, '66%'],
  [12, '100%'],
];

const TIME_FIELD_OPTIONS = [1, 5, 10, 15, 30, 60];

const TIME_FIELD_TYPES = ['datetime', 'time'];

const ModalForm = ({ onMetaChange, onSizeChange }) => {
  const { formatMessage } = useIntl();
  const { modifiedData, selectedField, attributes, fieldForm } = useLayoutDnd();
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector((state) => schemasSelector(state), shallowEqual);
  const fieldSizes = useSelector(selectFieldSizes);

  const formToDisplay = useMemo(() => {
    if (!selectedField) {
      return [];
    }

    const associatedMetas = get(modifiedData, ['metadatas', selectedField, 'edit'], {});

    return Object.keys(associatedMetas).filter((meta) => meta !== 'visible');
  }, [selectedField, modifiedData]);

  const componentsAndModelsPossibleMainFields = useMemo(() => {
    return createPossibleMainFieldsForModelsAndComponents(schemas);
  }, [schemas]);

  const getSelectedItemSelectOptions = useCallback(
    (formType) => {
      if (formType !== 'relation' && formType !== 'component') {
        return [];
      }

      const targetKey = formType === 'component' ? 'component' : 'targetModel';
      const key = get(modifiedData, ['attributes', selectedField, targetKey], '');

      return get(componentsAndModelsPossibleMainFields, [key], []);
    },

    [selectedField, componentsAndModelsPossibleMainFields, modifiedData]
  );

  const metaFields = formToDisplay.map((meta) => {
    const formType = get(attributes, [selectedField, 'type']);

    if (
      ['component', 'dynamiczone'].includes(formType) &&
      !['label', 'description'].includes(meta)
    ) {
      return null;
    }

    if (formType === 'component' && meta !== 'label') {
      return null;
    }

    if (['media', 'json', 'boolean'].includes(formType) && meta === 'placeholder') {
      return null;
    }

    if (meta === 'step') {
      return null;
    }

    return (
      <GridItem col={6} key={meta}>
        <GenericInput
          type={getInputProps(meta).type}
          hint={
            meta === 'mainField'
              ? formatMessage({
                  id: getTrad('containers.SettingPage.editSettings.relation-field.description'),
                })
              : ''
          }
          label={formatMessage({
            id: get(getInputProps(meta), 'label.id', 'app.utils.defaultMessage'),
          })}
          name={meta}
          onChange={onMetaChange}
          value={get(fieldForm, ['metadata', meta], '')}
          options={getSelectedItemSelectOptions(formType)}
        />
      </GridItem>
    );
  });

  // Check for a custom input provided by a custom field, or use the default one for that type
  const { type, customField } = attributes[selectedField];
  const { isResizable } = fieldSizes[customField] ?? fieldSizes[type];

  const sizeField = (
    <GridItem col={6} key="size">
      <Select
        value={fieldForm?.size}
        name="size"
        onChange={(value) => {
          onSizeChange({ name: selectedField, value });
        }}
        label={formatMessage({
          id: getTrad('containers.SettingPage.editSettings.size.label'),
          defaultMessage: 'Size',
        })}
      >
        {FIELD_SIZES.map(([value, label]) => (
          <Option key={value} value={value}>
            {label}
          </Option>
        ))}
      </Select>
    </GridItem>
  );

  const hasTimePicker = TIME_FIELD_TYPES.includes(attributes[selectedField].type);

  const timeStepField = (
    <GridItem col={6} key="step">
      <Select
        value={get(fieldForm, ['metadata', 'step'], 1)}
        name="step"
        onChange={(value) => onMetaChange({ target: { name: 'step', value } })}
        label={formatMessage({
          id: getTrad('containers.SettingPage.editSettings.step.label'),
          defaultMessage: 'Time interval (minutes)',
        })}
      >
        {TIME_FIELD_OPTIONS.map((value) => (
          <Option key={value} value={value}>
            {value}
          </Option>
        ))}
      </Select>
    </GridItem>
  );

  return (
    <>
      {metaFields}
      {isResizable && sizeField}
      {hasTimePicker && timeStepField}
    </>
  );
};

ModalForm.propTypes = {
  onMetaChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
};

export default ModalForm;
