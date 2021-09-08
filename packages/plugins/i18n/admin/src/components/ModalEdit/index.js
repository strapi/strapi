import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Form } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import CheckIcon from '@strapi/icons/CheckIcon';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { TabGroup, Tabs, Tab, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { Row } from '@strapi/parts/Row';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { Divider } from '@strapi/parts/Divider';
import { ButtonText, H2 } from '@strapi/parts/Text';
import localeFormSchema from '../../schemas';
import useEditLocale from '../../hooks/useEditLocale';
import { getTrad } from '../../utils';
import BaseForm from './BaseForm';
import AdvancedForm from './AdvancedForm';

const ModalEdit = ({ locale, onClose }) => {
  const { isEditing, editLocale } = useEditLocale();
  const shouldUpdateMenu = useRef(false);
  const { formatMessage } = useIntl();

  const handleSubmit = ({ displayName, isDefault }) => {
    const id = locale.id;
    const name = displayName || locale.code;

    return editLocale(id, { name, isDefault })
      .then(() => {
        shouldUpdateMenu.current = true;
      })
      .then(onClose);
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="edit-locale-title">
      <Formik
        initialValues={{
          code: locale?.code,
          displayName: locale?.name || '',
          isDefault: Boolean(locale?.isDefault),
        }}
        onSubmit={handleSubmit}
        validationSchema={localeFormSchema}
      >
        {({ handleSubmit }) => (
          <Form onSubmit={handleSubmit}>
            <ModalHeader>
              <ButtonText textColor="neutral800" as="h2" id="edit-locale-title">
                {formatMessage({ id: getTrad('Settings.list.actions.edit') })}
              </ButtonText>
            </ModalHeader>
            <ModalBody
              title={formatMessage({
                id: getTrad('Settings.locales.modal.title'),
              })}
              breadCrumb={[getTrad('Settings.list.actions.edit')]}
              tabsAriaLabel={formatMessage({
                id: getTrad('Settings.locales.modal.edit.tab.label'),
              })}
              tabsId="i18n-settings-tabs-edit"
            >
              <TabGroup
                label={formatMessage({
                  id: getTrad('Settings.locales.modal.title'),
                })}
                id="tabs"
                variant="simple"
              >
                <Row justifyContent="space-between">
                  <H2>
                    {formatMessage({
                      id: getTrad('Settings.locales.modal.title'),
                    })}
                  </H2>

                  <Tabs>
                    <Tab>
                      {formatMessage({
                        id: getTrad('Settings.locales.modal.base'),
                      })}
                    </Tab>
                    <Tab>
                      {formatMessage({
                        id: getTrad('Settings.locales.modal.advanced'),
                      })}
                    </Tab>
                  </Tabs>
                </Row>

                <Divider />

                <Box paddingTop={7} paddingBottom={7}>
                  <TabPanels>
                    <TabPanel>
                      <BaseForm locale={locale} />
                    </TabPanel>
                    <TabPanel>
                      <AdvancedForm isDefaultLocale={Boolean(locale && locale.isDefault)} />
                    </TabPanel>
                  </TabPanels>
                </Box>
              </TabGroup>
            </ModalBody>

            <ModalFooter
              startActions={
                <Button variant="tertiary" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel' })}
                </Button>
              }
              endActions={
                <Button type="submit" startIcon={<CheckIcon />} disabled={isEditing}>
                  {formatMessage({ id: 'app.components.Button.save' })}
                </Button>
              }
            />
          </Form>
        )}
      </Formik>
    </ModalLayout>
  );
};

ModalEdit.defaultProps = {
  locale: undefined,
};

ModalEdit.propTypes = {
  locale: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    isDefault: PropTypes.bool.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

export default ModalEdit;
