import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalFooter, TabPanel } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button } from '@buffetjs/core';
import { Formik } from 'formik';
import localeFormSchema from '../../schemas';
import { getTrad } from '../../utils';
import SettingsModal from '../SettingsModal';

const ModalCreate = ({ onClose, isOpened }) => {
  const { formatMessage } = useIntl();

  return (
    <Modal isOpen={isOpened} onToggle={onClose}>
      <Formik
        initialValues={{ displayName: '' }}
        onSubmit={() => null}
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
              <TabPanel>Base form</TabPanel>
              <TabPanel>advanced</TabPanel>
            </SettingsModal>

            <ModalFooter>
              <section>
                <Button type="button" color="cancel" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel' })}
                </Button>
                <Button
                  color="success"
                  type="submit"
                  isLoading={false}
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
};

export default ModalCreate;
