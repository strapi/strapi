import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Duplicate } from '@buffetjs/icons';
import { Label, Padded, Text } from '@buffetjs/core';
import Select from 'react-select';
import { useDispatch } from 'react-redux';
import { useTheme } from 'styled-components';
import { useIntl } from 'react-intl';
import {
  BaselineAlignment,
  ModalConfirm,
  selectStyles,
  DropdownIndicator,
  useContentManagerEditViewDataManager,
  formatComponentData,
  contentManagementUtilRemoveFieldsFromData,
  request,
} from 'strapi-helper-plugin';
import { getTrad } from '../../utils';
import removePasswordAndRelationsFieldFromData from './utils/removePasswordAndRelationsFieldFromData';

const cleanData = (data, { contentType, components }) => {
  const dataWithoutPasswordsAndRelations = removePasswordAndRelationsFieldFromData(
    data,
    contentType,
    components
  );

  const cleanedClonedData = contentManagementUtilRemoveFieldsFromData(
    dataWithoutPasswordsAndRelations,
    contentType,
    components
  );

  return formatComponentData(cleanedClonedData, contentType, components);
};

const CMEditViewCopyLocale = ({ appLocales, currentLocale, localizations }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { allLayoutData, slug } = useContentManagerEditViewDataManager();

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(null);
  const theme = useTheme();

  const handleConfirmCopyLocale = async () => {
    if (!value) {
      handleToggle();

      return;
    }

    const requestURL = `/content-manager/collection-types/${slug}/${value.value}`;

    try {
      const response = await request(requestURL, { method: 'GET' });
      const cleanedData = cleanData(response, allLayoutData);

      dispatch({ type: 'ContentManager/CrudReducer/GET_DATA_SUCCEEDED', data: cleanedData });

      handleToggle();
    } catch (err) {
      console.log(err);
    }
  };

  const handleChange = value => {
    setValue(value);
  };

  const handleToggle = () => {
    setIsOpen(prev => !prev);
  };

  if (!localizations.length) {
    return null;
  }

  const options = appLocales
    .filter(({ code }) => {
      return (
        code !== currentLocale && localizations.findIndex(({ locale }) => locale === code) !== -1
      );
    })
    .map(locale => {
      return {
        label: locale.name,
        value: localizations.find(loc => locale.code === loc.locale).id,
      };
    });

  const styles = selectStyles(theme);

  return (
    <>
      <BaselineAlignment top size="12px" />
      <Text
        color="mediumBlue"
        fontWeight="semiBold"
        style={{ cursor: 'pointer' }}
        onClick={handleToggle}
      >
        <span style={{ marginRight: 10 }}>
          <Duplicate fill="#007EFF" />
        </span>
        {formatMessage({
          id: getTrad('CMEditViewCopyLocale.copy-text'),
          defaultMessage: 'Fill in from another locale',
        })}
      </Text>
      <ModalConfirm
        confirmButtonLabel={{
          id: 'form.button.finish',
        }}
        content={{
          id: 'CMEditViewCopyLocale.ModalConfirm.content',
          defaultMessage:
            'Your current content will be erased and filled by the content of the selected locale:',
        }}
        isOpen={isOpen}
        onConfirm={handleConfirmCopyLocale}
        title={{ id: 'CMEditViewCopyLocale.ModalConfirm.title', defaultMessage: 'Select Locale' }}
        toggle={handleToggle}
        type="success"
      >
        <Padded style={{ marginTop: -3 }} bottom size="sm">
          <span id="select-locale" style={{ textAlign: 'left' }}>
            <Label htmlFor="">
              {formatMessage({
                id: getTrad('Settings.locales.modal.locales.label'),
              })}
            </Label>
            <BaselineAlignment top size="3px" />
            <Select
              aria-labelledby="select-locale"
              components={{ DropdownIndicator }}
              isSearchable={false}
              onChange={handleChange}
              options={options}
              styles={{
                ...styles,
                control: (base, state) => ({
                  ...base,
                  ...styles.control(base, state),
                  height: '34px',
                }),
                indicatorsContainer: (base, state) => ({
                  ...base,
                  ...styles.indicatorsContainer(base, state),
                  height: '32px',
                }),
                valueContainer: base => ({
                  ...base,
                  padding: '2px 0px 4px 10px',
                  lineHeight: '18px',
                }),
              }}
              value={value}
            />
          </span>
        </Padded>
      </ModalConfirm>
    </>
  );
};

CMEditViewCopyLocale.propTypes = {
  appLocales: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  currentLocale: PropTypes.string.isRequired,
  localizations: PropTypes.array.isRequired,
};

export default CMEditViewCopyLocale;
