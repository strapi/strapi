import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalFooter, TabPanel } from 'strapi-helper-plugin';
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

const ModalCreate = ({ onClose, isOpened, onSuccess }) => {
  const { defaultLocales, isLoading } = useDefaultLocales();
  const { isAdding, addLocale } = useAddLocale();
  const { formatMessage } = useIntl();

  if (!isOpened) return null;

  if (isLoading) {
    return (
      <div>
        <p>
          {formatMessage({ id: getTrad('Settings.locales.modal.create.defaultLocales.loading') })}
        </p>
      </div>
    );
  }

  const options = (defaultLocales || []).map(locale => ({
    label: locale.code,
    value: locale.name,
  }));

  const defaultOption = options[0];

  return (
    <Modal isOpen={isOpened} onToggle={onClose} withoverflow="true">
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
          }).then(() => {
            onSuccess();
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
                <BaseForm options={options} defaultOption={defaultOption} />
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

ModalCreate.propTypes = {
  onClose: PropTypes.func.isRequired,
  isOpened: PropTypes.bool.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default ModalCreate;
