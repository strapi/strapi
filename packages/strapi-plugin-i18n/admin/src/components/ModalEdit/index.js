import React from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  ModalHeader,
  HeaderModal,
  HeaderModalTitle,
  ModalFooter,
  ModalForm,
  Tabs,
  TabsNav,
  Tab,
  TabsPanel,
  TabPanel,
} from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button } from '@buffetjs/core';
import { Formik } from 'formik';
import { object, string } from 'yup';
import useEditLocale from '../../hooks/useEditLocale';
import { getTrad } from '../../utils';
import BaseForm from './BaseForm';

const ModalEdit = ({ localeToEdit, onClose, locales }) => {
  const { isEditing, editLocale } = useEditLocale();
  const { formatMessage } = useIntl();
  const isOpened = Boolean(localeToEdit);

  const handleSubmit = ({ displayName }) => {
    const id = localeToEdit.id;
    const name = displayName || localeToEdit.code;

    return editLocale(id, name).then(onClose);
  };

  let options = [];
  let defaultOption;

  if (localeToEdit) {
    options = locales.map(locale => ({ label: locale.code, value: locale.id }));
    defaultOption = options.find(option => option.value === localeToEdit.id);
  }

  return (
    <Modal isOpen={isOpened} onToggle={onClose}>
      <HeaderModal>
        <ModalHeader
          headerBreadcrumbs={[formatMessage({ id: getTrad('Settings.list.actions.edit') })]}
        />
      </HeaderModal>

      <Formik
        initialValues={{ displayName: localeToEdit ? localeToEdit.name : '' }}
        onSubmit={handleSubmit}
        validationSchema={object().shape({
          displayName: string().max(50, 'Settings.locales.modal.edit.locales.displayName.error'),
        })}
      >
        {({ handleSubmit, errors }) => (
          <form onSubmit={handleSubmit}>
            <div className="container-fluid">
              <div className="container-fluid">
                <HeaderModalTitle
                  style={{
                    fontSize: '1.8rem',
                    height: '65px',
                    fontWeight: 'bold',
                    alignItems: 'center',
                    marginBottom: '-39px',
                    paddingTop: '16px',
                  }}
                >
                  {formatMessage({
                    id: getTrad('Settings.locales.modal.title'),
                  })}
                </HeaderModalTitle>

                <ModalForm>
                  <TabsNav
                    defaultSelection={0}
                    label={formatMessage({
                      id: getTrad('Settings.locales.modal.edit.tab.label'),
                    })}
                    id="i18n-settings-tabs"
                  >
                    <Tabs position="right">
                      <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.base') })}</Tab>
                      <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.advanced') })}</Tab>
                    </Tabs>

                    <TabsPanel>
                      <TabPanel>
                        <BaseForm options={options} defaultOption={defaultOption} />
                      </TabPanel>
                      <TabPanel>advanced</TabPanel>
                    </TabsPanel>
                  </TabsNav>
                </ModalForm>
              </div>
            </div>

            <ModalFooter>
              <section>
                <Button type="button" color="cancel" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel' })}
                </Button>
                <Button
                  color="success"
                  type="submit"
                  isLoading={isEditing}
                  disabled={Object.keys(errors).length > 0}
                >
                  {formatMessage({ id: getTrad('Settings.locales.modal.edit.confirmation') })}
                </Button>
              </section>
            </ModalFooter>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

ModalEdit.defaultProps = {
  localeToEdit: undefined,
  locales: [],
};

ModalEdit.propTypes = {
  localeToEdit: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  locales: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
    })
  ),
};

export default ModalEdit;
