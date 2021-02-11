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
import { getTrad } from '../../utils';

const ModalCreate = ({ onClose, isOpened }) => {
  const { formatMessage } = useIntl();

  return (
    <Modal isOpen={isOpened} onToggle={onClose}>
      <HeaderModal>
        <ModalHeader
          headerBreadcrumbs={[formatMessage({ id: getTrad('Settings.list.actions.add') })]}
        />
      </HeaderModal>

      <Formik
        initialValues={{ displayName: '' }}
        onSubmit={() => null}
        validationSchema={object().shape({
          displayName: string().max(50, 'Settings.locales.modal.create.locales.displayName.error'),
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
                      id: getTrad('Settings.locales.modal.create.tab.label'),
                    })}
                    id="i18n-settings-tabs"
                  >
                    <Tabs position="right">
                      <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.base') })}</Tab>
                      <Tab>{formatMessage({ id: getTrad('Settings.locales.modal.advanced') })}</Tab>
                    </Tabs>

                    <TabsPanel>
                      <TabPanel>Base form</TabPanel>
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
