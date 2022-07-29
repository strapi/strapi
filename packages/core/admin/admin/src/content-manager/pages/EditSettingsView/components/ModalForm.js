import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { GridItem } from '@strapi/design-system/Grid';
import { Select, Option } from '@strapi/design-system/Select';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import { useLayoutDnd } from '../../../hooks';
import { createPossibleMainFieldsForModelsAndComponents, getInputProps } from '../utils';
import { makeSelectModelAndComponentSchemas } from '../../App/selectors';
import getTrad from '../../../utils/getTrad';
import GenericInput from './GenericInput';

const FIELD_SIZES = [
  [4, '33%'],
  [6, '50%'],
  [8, '66%'],
  [12, '100%'],
];

const NON_RESIZABLE_FIELD_TYPES = ['dynamiczone', 'component', 'json', 'richtext'];

const ModalForm = ({ onMetaChange, onSizeChange }) => {
  const { formatMessage } = useIntl();
  const { modifiedData, selectedField, attributes, fieldForm } = useLayoutDnd();
  const schemasSelector = useMemo(makeSelectModelAndComponentSchemas, []);
  const { schemas } = useSelector(state => schemasSelector(state), shallowEqual);

  const formToDisplay = useMemo(() => {
    if (!selectedField) {
      return [];
    }

    const associatedMetas = get(modifiedData, ['metadatas', selectedField, 'edit'], {});

    return Object.keys(associatedMetas).filter(meta => meta !== 'visible');
  }, [selectedField, modifiedData]);

  const componentsAndModelsPossibleMainFields = useMemo(() => {
    return createPossibleMainFieldsForModelsAndComponents(schemas);
  }, [schemas]);

  const getSelectedItemSelectOptions = useCallback(
    formType => {
      if (formType !== 'relation' && formType !== 'component') {
        return [];
      }

      const targetKey = formType === 'component' ? 'component' : 'targetModel';
      const key = get(modifiedData, ['attributes', selectedField, targetKey], '');

      return get(componentsAndModelsPossibleMainFields, [key], []);
    },

    [selectedField, componentsAndModelsPossibleMainFields, modifiedData]
  );

  const metaFields = formToDisplay.map(meta => {
    const formType = get(attributes, [selectedField, 'type']);

    if (
      formType === 'dynamiczone' ||
      (formType === 'component' && !['label', 'description'].includes(meta))
    ) {
      return null;
    }

    if (formType === 'component' && meta !== 'label') {
      return null;
    }

    if (['media', 'json', 'boolean'].includes(formType) && meta === 'placeholder') {
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

  const canResize = !NON_RESIZABLE_FIELD_TYPES.includes(attributes[selectedField].type);

  const sizeField = (
    <GridItem col={6} key="size">
      <Select
        value={fieldForm?.size}
        name="size"
        onChange={value => {
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

  return (
    <>
      {metaFields}
      {canResize && sizeField}
    </>
  );
};

ModalForm.propTypes = {
  onMetaChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
};

export default ModalForm;
