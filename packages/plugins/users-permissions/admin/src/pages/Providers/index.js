import React, { useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  SettingsPageTitle,
  // SizedInput,
  // useTracking,
  // getYupInnerErrors,
  // request,
  // useNotification,
  // useOverlayBlocker,
  LoadingIndicatorPage,
  // SizedInput,
  useTracking,
  // getYupInnerErrors,
  // request,
  useNotification,
  useOverlayBlocker,
  CheckPagePermissions,
} from '@strapi/helper-plugin';
import has from 'lodash/has';
import upperFirst from 'lodash/upperFirst';
// import { get, upperFirst, has } from 'lodash';
// import has from 'lodash/has';
// import { Row } from 'reactstrap';

// // DS INTEGRATION
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { HeaderLayout, Layout, ContentLayout } from '@strapi/parts/Layout';
import { Main } from '@strapi/parts/Main';
import { Table, Thead, Tr, Th, Tbody, Td } from '@strapi/parts/Table';
import { Text, TableLabel } from '@strapi/parts/Text';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { IconButton } from '@strapi/parts/IconButton';
import EditIcon from '@strapi/icons/EditIcon';
import forms from './utils/forms';
import createProvidersArray from './utils/createProvidersArray';
// import ModalForm from '../../components/ModalForm';
import {
  // getRequestURL,
  getTrad,
} from '../../utils';
import { useForm } from '../../hooks';
import pluginPermissions from '../../permissions';
import FormModal from '../../components/FormModal';

export const ProvidersPage = () => {
  const { formatMessage } = useIntl();

  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  // const buttonSubmitRef = useRef(null);
  // const [showForm, setShowForm] = useState(false);
  const [providerToEditName, setProviderToEditName] = useState(null);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateProviders };
  }, []);

  const {
    allowedActions: { canUpdate },
    // dispatchResetForm,
    // dispatchSetFormErrors,
    // dispatchSubmitSucceeded,
    // formErrors,
    // handleChange,
    isLoading,
    isLoadingForPermissions,
    modifiedData,
  } = useForm('providers', updatePermissions);

  const providers = useMemo(() => createProvidersArray(modifiedData), [modifiedData]);

  const rowCount = providers.length;

  const isProviderWithSubdomain = useMemo(() => {
    if (!providerToEditName) {
      return false;
    }

    const providerToEdit = providers.find(obj => obj.name === providerToEditName);

    return has(providerToEdit, 'subdomain');
  }, [providers, providerToEditName]);

  const pageTitle = formatMessage({
    id: getTrad('HeaderNav.link.providers'),
    defaultMessage: 'Providers',
  });

  const layoutToRender = useMemo(() => {
    if (providerToEditName === 'email') {
      return forms.email;
    }

    if (isProviderWithSubdomain) {
      return forms.providersWithSubdomain;
    }

    return forms.providers;
  }, [providerToEditName, isProviderWithSubdomain]);

  // const handleClick = useCallback(() => {
  //   buttonSubmitRef.current.click();
  // }, []);

  const handleToggleModal = () => {
    setIsOpen(prev => !prev);
  };

  const handleClickEdit = provider => {
    if (canUpdate) {
      setProviderToEditName(provider.name);
      handleToggleModal();
    }
  };

  // const handleClosed = useCallback(() => {
  //   setProviderToEditName(null);
  //   setShowForm(false);
  //   dispatchResetForm();
  // }, [dispatchResetForm]);

  // const handleOpened = useCallback(() => {
  //   setShowForm(true);
  // }, []);

  const handleSubmit = async () => {
    // e.preventDefault();

    setIsSubmiting(true);

    lockApp();

    try {
      trackUsageRef.current('willEditAuthenticationProvider');

      // await request(getRequestURL('providers'), {
      //   method: 'PUT',
      //   body: { providers: modifiedData },
      // });

      trackUsageRef.current('didEditAuthenticationProvider');

      toggleNotification({
        type: 'success',
        message: { id: getTrad('notification.success.submit') },
      });

      // dispatchSubmitSucceeded();

      // handleToggle();
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }

    setIsSubmiting(false);
    unlockApp();
  };

  console.log({ modifiedData, providerToEditName });

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main
        labelledBy={formatMessage({
          id: getTrad('HeaderNav.link.providers'),
          defaultMessage: 'Providers',
        })}
      >
        <HeaderLayout
          as="h1"
          id="providers"
          title={formatMessage({
            id: getTrad('HeaderNav.link.providers'),
            defaultMessage: 'Providers',
          })}
        />
        {isLoading || isLoadingForPermissions ? (
          <LoadingIndicatorPage />
        ) : (
          <ContentLayout>
            <Table colCount={4} rowCount={rowCount + 1}>
              <Thead>
                <Tr>
                  <Th>
                    <TableLabel>
                      <VisuallyHidden>
                        {formatMessage({ id: getTrad('Providers.image'), defaultMessage: 'Image' })}
                      </VisuallyHidden>
                    </TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>
                      {formatMessage({ id: getTrad('Providers.name'), defaultMessage: 'Name' })}
                    </TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>
                      {formatMessage({ id: getTrad('Providers.status'), defaultMessage: 'Status' })}
                    </TableLabel>
                  </Th>
                  <Th>
                    <TableLabel>
                      <VisuallyHidden>
                        {formatMessage({
                          id: getTrad('Providers.settings'),
                          defaultMessage: 'Settings',
                        })}
                      </VisuallyHidden>
                    </TableLabel>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {providers.map(provider => (
                  <Tr key={provider.name}>
                    <Td width="">
                      <FontAwesomeIcon icon={provider.icon} />
                    </Td>
                    <Td width="45%">
                      <Text highlighted textColor="neutral800">
                        {provider.name}
                      </Text>
                    </Td>
                    <Td width="65%">
                      <Text
                        textColor={provider.enabled ? 'success600' : 'danger600'}
                        data-testid={`enable-${provider.name}`}
                      >
                        {provider.enabled
                          ? formatMessage({
                              id: getTrad('Providers.enabled'),
                              defaultMessage: 'Enabled',
                            })
                          : formatMessage({
                              id: getTrad('Providers.disabled'),
                              defaultMessage: 'Disabled',
                            })}
                      </Text>
                    </Td>
                    <Td>
                      {canUpdate && (
                        <IconButton
                          onClick={() => handleClickEdit(provider)}
                          noBorder
                          icon={<EditIcon />}
                          label="Edit"
                        />
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </ContentLayout>
        )}
      </Main>
      <FormModal
        initialData={modifiedData[providerToEditName]}
        isOpen={isOpen}
        isSubmiting={isSubmiting}
        layout={layoutToRender}
        headerBreadcrumbs={[
          formatMessage({
            id: getTrad('PopUpForm.header.edit.providers'),
            defaultMessage: 'Edit Provider',
          }),
          upperFirst(providerToEditName),
        ]}
        onToggle={handleToggleModal}
        onSubmit={handleSubmit}
        providerToEditName={providerToEditName}
      />

      {/* <ModalForm
        isOpen={isOpen}
        onClick={handleClick}
        onCancel={handleToggle}
        isLoading={isSubmiting}
        onOpened={handleOpened}
        onClosed={handleClosed}
        onToggle={handleToggle}
        headerBreadcrumbs={[
          formatMessage({
            id: getTrad('PopUpForm.header.edit.providers'),
            defaultMessage: 'Edit Provider',
          }),
          upperFirst(providerToEditName),
        ]}
      >
        {showForm && (
          <form onSubmit={handleSubmit}>
            <Row>
              {layoutToRender.form.map(input => {
                const label = input.label.params
                  ? { ...input.label, params: { provider: upperFirst(providerToEditName) } }
                  : input.label;

                const value =
                  input.name === 'noName'
                    ? `${strapi.backendURL}/connect/${providerToEditName}/callback`
                    : get(modifiedData, [providerToEditName, ...input.name.split('.')], '');

                return (
                  <SizedInput
                    key={input.name}
                    {...input}
                    label={label}
                    error={formErrors[input.name]}
                    name={`${providerToEditName}.${input.name}`}
                    onChange={handleChange}
                    value={value}
                  />
                );
              })}
            </Row>
            <button type="submit" style={{ display: 'none' }} ref={buttonSubmitRef}>
              hidden button to use the native form event
            </button>
          </form>
        )}
      </ModalForm> */}
    </Layout>
  );
};

const ProtectedProvidersPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.readProviders}>
    <ProvidersPage />
  </CheckPagePermissions>
);

export default ProtectedProvidersPage;
