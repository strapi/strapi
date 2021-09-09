import React from 'react';
import PropTypes from 'prop-types';
import { Form, useRBACProvider } from '@strapi/helper-plugin';
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
  const { refetchPermissions } = useRBACProvider();
  const { isEditing, editLocale } = useEditLocale();
  const { formatMessage } = useIntl();

  const handleSubmit = async ({ displayName, isDefault }) => {
    await editLocale(locale.id, { name: displayName, isDefault });
    await refetchPermissions();
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
        <Form>
          <ModalHeader>
            <ButtonText textColor="neutral800" as="h2" id="edit-locale-title">
              {formatMessage({
                id: getTrad('Settings.list.actions.edit'),
                defaultMessage: 'Edit a locale',
              })}
            </ButtonText>
          </ModalHeader>
          <ModalBody>
            <TabGroup
              label={formatMessage({
                id: getTrad('Settings.locales.modal.title'),
                defaultMessage: 'Configurations',
              })}
              id="tabs"
              variant="simple"
            >
              <Row justifyContent="space-between">
                <H2>
                  {formatMessage({
                    id: getTrad('Settings.locales.modal.title'),
                    defaultMessage: 'Configurations',
                  })}
                </H2>
                <Tabs>
                  <Tab>
                    {formatMessage({
                      id: getTrad('Settings.locales.modal.base'),
                      defaultMessage: 'Base settings',
                    })}
                  </Tab>
                  <Tab>
                    {formatMessage({
                      id: getTrad('Settings.locales.modal.advanced'),
                      defaultMessage: 'Advanced settings',
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
