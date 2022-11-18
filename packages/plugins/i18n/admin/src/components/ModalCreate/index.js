import React from 'react';
import PropTypes from 'prop-types';
import { useRBACProvider, Form } from '@strapi/helper-plugin';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TabGroup,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  Typography,
  Divider,
  Box,
  Flex,
} from '@strapi/design-system';
import Check from '@strapi/icons/Check';
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
  const handleLocaleAdd = async (values) => {
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
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="add-locale-title">
              {formatMessage({
                id: getTrad('Settings.list.actions.add'),
                defaultMessage: 'Add new locale',
              })}
            </Typography>
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
              <Flex justifyContent="space-between">
                <Typography as="h2" variant="beta">
                  {formatMessage({
                    id: getTrad('Settings.locales.modal.title'),
                    defaultMessage: 'Configurations',
                  })}
                </Typography>
                <Tabs>
                  <Tab>
                    {formatMessage({
                      id: getTrad('Settings.locales.modal.base'),
                      defaultMessage: 'Basic settings',
                    })}
                  </Tab>
                  <Tab>
                    {formatMessage({
                      id: getTrad('Settings.locales.modal.advanced'),
                      defaultMessage: 'Advanced settings',
                    })}
                  </Tab>
                </Tabs>
              </Flex>

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
              <Button type="submit" startIcon={<Check />} disabled={isAdding}>
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
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
