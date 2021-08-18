import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
// import { Header, List } from '@buffetjs/custom';
// import { Text } from '@buffetjs/core';
// import { Pencil } from '@buffetjs/icons';
import {
  SettingsPageTitle,
  SizedInput,
  useTracking,
  getYupInnerErrors,
  request,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { get, upperFirst, has } from 'lodash';
import { Row } from 'reactstrap';
// import ListBaselineAlignment from '../../components/ListBaselineAlignment';
// import ListRow from '../../components/ListRow';

// DS INTEGRATION
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
import ModalForm from '../../components/ModalForm';
import { getRequestURL, getTrad } from '../../utils';
import { useForm } from '../../hooks';
import pluginPermissions from '../../permissions';

const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const buttonSubmitRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [providerToEditName, setProviderToEditName] = useState(null);
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();

  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateProviders };
  }, []);
  console.log(updatePermissions);

  const {
    allowedActions: { canUpdate },
    dispatchResetForm,
    dispatchSetFormErrors,
    dispatchSubmitSucceeded,
    formErrors,
    handleChange,
    // isLoading,
    // isLoadingForPermissions,
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

  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.providers') });

  const formToRender = useMemo(() => {
    if (providerToEditName === 'email') {
      return forms.email;
    }

    if (isProviderWithSubdomain) {
      return forms.providersWithSubdomain;
    }

    return forms.providers;
  }, [providerToEditName, isProviderWithSubdomain]);

  const handleClick = useCallback(() => {
    buttonSubmitRef.current.click();
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClickEdit = useCallback(
    provider => {
      if (canUpdate) {
        setProviderToEditName(provider.name);
        handleToggle();
      }
    },
    [canUpdate, handleToggle]
  );

  const handleClosed = useCallback(() => {
    setProviderToEditName(null);
    setShowForm(false);
    dispatchResetForm();
  }, [dispatchResetForm]);

  const handleOpened = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleSubmit = useCallback(
    async e => {
      e.preventDefault();
      const { schema } = formToRender;
      let errors = {};

      setIsSubmiting(true);

      try {
        await schema.validate(modifiedData[providerToEditName], { abortEarly: false });
        lockApp();

        try {
          trackUsageRef.current('willEditAuthenticationProvider');

          await request(getRequestURL('providers'), {
            method: 'PUT',
            body: { providers: modifiedData },
          });

          trackUsageRef.current('didEditAuthenticationProvider');

          toggleNotification({
            type: 'success',
            message: { id: getTrad('notification.success.submit') },
          });

          dispatchSubmitSucceeded();

          handleToggle();
        } catch (err) {
          console.error(err);
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
      } catch (err) {
        console.error(err);
        errors = getYupInnerErrors(err);
        console.log(errors);
      }

      dispatchSetFormErrors(errors);

      setIsSubmiting(false);
      unlockApp();
    },
    [
      dispatchSetFormErrors,
      dispatchSubmitSucceeded,
      formToRender,
      handleToggle,
      modifiedData,
      providerToEditName,
      toggleNotification,
      lockApp,
      unlockApp,
    ]
  );

  return (
    <Layout>
      <SettingsPageTitle name={pageTitle} />
      <Main labelledBy={formatMessage({ id: getTrad('HeaderNav.link.providers') })}>
        <HeaderLayout
          as="h1"
          id="providers"
          title={formatMessage({ id: getTrad('HeaderNav.link.providers') })}
        />
        <ContentLayout>
          <Table colCount={4} rowCount={rowCount + 1}>
            <Thead>
              <Tr>
                <Th>
                  <TableLabel>
                    <VisuallyHidden>
                      {formatMessage({ id: getTrad('Providers.image') })}
                    </VisuallyHidden>
                  </TableLabel>
                </Th>
                <Th>
                  <TableLabel>{formatMessage({ id: getTrad('Providers.name') })}</TableLabel>
                </Th>
                <Th>
                  <TableLabel>{formatMessage({ id: getTrad('Providers.status') })}</TableLabel>
                </Th>
                <Th>
                  <TableLabel>
                    <VisuallyHidden>
                      {formatMessage({ id: getTrad('Providers.settings') })}
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
                    <Text textColor={provider.enabled ? 'success600' : 'danger600'}>
                      {provider.enabled
                        ? formatMessage({ id: getTrad('Providers.enabled') })
                        : formatMessage({ id: getTrad('Providers.disabled') })}
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
      </Main>
      <ModalForm
        isOpen={isOpen}
        onClick={handleClick}
        onCancel={handleToggle}
        isLoading={isSubmiting}
        onOpened={handleOpened}
        onClosed={handleClosed}
        onToggle={handleToggle}
        headerBreadcrumbs={[
          getTrad('PopUpForm.header.edit.providers'),
          upperFirst(providerToEditName),
        ]}
      >
        {showForm && (
          <form onSubmit={handleSubmit}>
            <Row>
              {formToRender.form.map(input => {
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
      </ModalForm>
    </Layout>
  );
};

export default ProvidersPage;
