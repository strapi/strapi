import React from 'react';
import PropTypes from 'prop-types';
import { useRBACProvider, Form } from '@strapi/helper-plugin';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { TabGroup, Tabs, Tab, TabPanels, TabPanel } from '@strapi/parts/Tabs';
import { Button } from '@strapi/parts/Button';
import { ButtonText, H2 } from '@strapi/parts/Text';
import { Divider } from '@strapi/parts/Divider';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import CheckIcon from '@strapi/icons/CheckIcon';
import { useIntl } from 'react-intl';
import { Formik } from 'formik';
import localeFormSchema from '../../schemas';
import { getTrad } from '../../utils';
import useAddLocale from '../../hooks/useAddLocale';
import BaseForm from './BaseForm';
import AdvancedForm from './AdvancedForm';

const initialFormValues = {
  code: '',
  displayName: '',
  isDefault: false,
};

const ModalCreate = ({ onClose }) => {
  const { isAdding, addLocale } = useAddLocale();
  const { formatMessage } = useIntl();
  const { refetchPermissions } = useRBACProvider();

  /**
   * No need to explicitly call the onClose prop here
   * since the all tree (from the root of the page) is destroyed and re-mounted
   * because of the RBAC refreshing and the potential move of the default locale
   */
  const handleLocaleAdd = async values => {
    await addLocale({
      code: values.code,
      name: values.displayName,
      isDefault: values.isDefault,
    });

    await refetchPermissions();
  };

  return (
    <ModalLayout onClose={onClose} labelledBy="add-locale-title">
      <Formik
        initialValues={initialFormValues}
        onSubmit={handleLocaleAdd}
        validationSchema={localeFormSchema}
        validateOnChange={false}
      >
        <Form>
          <ModalHeader>
            <ButtonText textColor="neutral800" as="h2" id="add-locale-title">
              {formatMessage({ id: getTrad('Settings.list.actions.add') })}
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
                    <BaseForm />
                  </TabPanel>
                  <TabPanel>
                    <AdvancedForm />
                  </TabPanel>
                </TabPanels>
              </Box>
            </TabGroup>
          </ModalBody>
          <ModalFooter
            startActions={
              <Button variant="tertiary" onClick={onClose}>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            }
            endActions={
              <Button type="submit" startIcon={<CheckIcon />} disabled={isAdding}>
                {formatMessage({ id: 'app.components.Button.save', defaultMessage: 'Save' })}
              </Button>
            }
          />
        </Form>
      </Formik>
    </ModalLayout>
  );
};

ModalCreate.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default ModalCreate;
