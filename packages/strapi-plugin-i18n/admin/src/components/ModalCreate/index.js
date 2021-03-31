import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalFooter, TabPanel, useUser } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button } from '@buffetjs/core';
import { Formik } from 'formik';
import localeFormSchema from '../../schemas';
import { getTrad } from '../../utils';
import SettingsModal from '../SettingsModal';
import useDefaultLocales from '../../hooks/useDefaultLocales';
import useAddLocale from '../../hooks/useAddLocale';
import BaseForm from './BaseForm';
import AdvancedForm from './AdvancedForm';

const ModalCreate = ({ alreadyUsedLocales, onClose, isOpened }) => {
  const { defaultLocales, isLoading } = useDefaultLocales();
  const { isAdding, addLocale } = useAddLocale();
  const { formatMessage } = useIntl();

  const { fetchUserPermissions } = useUser();
  const shouldUpdatePermissions = useRef(false);

  if (isLoading) {
    return (
      <div>
        <p>
          {formatMessage({ id: getTrad('Settings.locales.modal.create.defaultLocales.loading') })}
        </p>
      </div>
    );
  }

  const handleClosed = async () => {
    if (shouldUpdatePermissions.current) {
      await fetchUserPermissions();
    }

    shouldUpdatePermissions.current = true;
  };

  const options = (defaultLocales || [])
    .map(locale => ({
      label: locale.code,
      value: locale.name,
    }))
    .filter(({ label }) => {
      const foundLocale = alreadyUsedLocales.find(({ code }) => code === label);

      return !foundLocale;
    });

  const defaultOption = options[0];

  if (!defaultOption) {
    return null;
  }

  return (
    <Modal isOpen={isOpened} onToggle={onClose} withoverflow="true" onClosed={handleClosed}>
      <Formik
        initialValues={{
          code: defaultOption.label,
          displayName: defaultOption.value,
          isDefault: false,
        }}
        onSubmit={values =>
          addLocale({
            code: values.code,
            name: values.displayName,
            isDefault: values.isDefault,
          })
            .then(() => {
              shouldUpdatePermissions.current = true;
            })
            .then(() => {
              onClose();
            })}
        validationSchema={localeFormSchema}
      >
        {({ handleSubmit, errors }) => (
          <form onSubmit={handleSubmit}>
            <SettingsModal
              title={formatMessage({
                id: getTrad('Settings.locales.modal.title'),
              })}
              breadCrumb={[formatMessage({ id: getTrad('Settings.list.actions.add') })]}
              tabsAriaLabel={formatMessage({
                id: getTrad('Settings.locales.modal.create.tab.label'),
              })}
              tabsId="i18n-settings-tabs-create"
            >
              <TabPanel>
                <BaseForm
                  options={options}
                  defaultOption={defaultOption}
                  alreadyUsedLocales={alreadyUsedLocales}
                />
              </TabPanel>
              <TabPanel>
                <AdvancedForm />
              </TabPanel>
            </SettingsModal>

            <ModalFooter>
              <section>
                <Button type="button" color="cancel" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel' })}
                </Button>
                <Button
                  color="success"
                  type="submit"
                  isLoading={isAdding}
                  disabled={Object.keys(errors).length > 0}
                >
                  {formatMessage({ id: getTrad('Settings.locales.modal.create.confirmation') })}
                </Button>
              </section>
            </ModalFooter>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

ModalCreate.defaultProps = {
  alreadyUsedLocales: [],
};

ModalCreate.propTypes = {
  alreadyUsedLocales: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool.isRequired,
};

export default ModalCreate;
