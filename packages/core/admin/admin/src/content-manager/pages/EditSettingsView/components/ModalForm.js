import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { GridItem } from '@strapi/design-system/Grid';
import { useSelector, shallowEqual } from 'react-redux';
import { useIntl } from 'react-intl';
import { useLayoutDnd } from '../../../hooks';
import { createPossibleMainFieldsForModelsAndComponents, getInputProps } from '../utils';
import { makeSelectModelAndComponentSchemas } from '../../App/selectors';
import getTrad from '../../../utils/getTrad';
import GenericInput from './GenericInput';

const ModalForm = ({ onChange }) => {
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

  return formToDisplay.map(meta => {
    const formType = get(attributes, [selectedField, 'type']);

    if (formType === 'dynamiczone' && !['label', 'description'].includes(meta)) {
      return null;
    }

    if ((formType === 'component' || formType === 'media') && meta !== 'label') {
      return null;
    }

    if ((formType === 'json' || formType === 'boolean') && meta === 'placeholder') {
      return null;
    }

    if (formType === 'richtext' && meta === 'editable') {
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
          onChange={onChange}
          value={get(fieldForm, meta, '')}
          options={getSelectedItemSelectOptions(formType)}
        />
      </GridItem>
    );
  });
};

export default ModalForm;
