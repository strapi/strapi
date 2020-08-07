import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Header, List } from '@buffetjs/custom';
import { Text } from '@buffetjs/core';
import { Pencil } from '@buffetjs/icons';
import {
  SettingsPageTitle,
  SizedInput,
  useUserPermissions,
  getYupInnerErrors,
  request,
} from 'strapi-helper-plugin';
import { get, upperFirst } from 'lodash';
import { Row } from 'reactstrap';
import pluginPermissions from '../../permissions';
import { getRequestURL, getTrad } from '../../utils';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import ListRow from '../../components/ListRow';
import ModalForm from '../../components/ModalForm';
import createProvidersArray from './utils/createProvidersArray';
import forms from './utils/forms';
import reducer, { initialState } from './reducer';

const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmiting, setIsSubmiting] = useState(false);
  const buttonSubmitRef = useRef(null);
  const [showForm, setShowForm] = useState(false);
  const [providerToEditName, setProviderToEditName] = useState(null);

  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateProviders };
  }, []);
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useUserPermissions(updatePermissions);
  const [{ formErrors, isLoading, modifiedData }, dispatch] = useReducer(reducer, initialState);
  const providers = useMemo(() => createProvidersArray(modifiedData), [modifiedData]);
  const enabledProvidersCount = useMemo(
    () => providers.filter(provider => provider.enabled).length,
    [providers]
  );
  const disabledProvidersCount = useMemo(() => {
    return providers.length - enabledProvidersCount;
  }, [providers, enabledProvidersCount]);

  const listTitle = useMemo(() => {
    const enabledMessage = formatMessage(
      {
        id: getTrad(
          `List.title.providers.enabled.${enabledProvidersCount > 1 ? 'plural' : 'singular'}`
        ),
      },
      { number: enabledProvidersCount }
    );
    const disabledMessage = formatMessage(
      {
        id: getTrad(
          `List.title.providers.disabled.${disabledProvidersCount > 1 ? 'plural' : 'singular'}`
        ),
      },
      { number: disabledProvidersCount }
    );

    return `${enabledMessage} ${disabledMessage}`;
  }, [formatMessage, enabledProvidersCount, disabledProvidersCount]);

  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.providers') });

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL('providers'), { method: 'GET' });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });

        console.log({ data });
      } catch (err) {
        dispatch({
          type: 'GET_DATA_ERROR',
        });
        console.error(err);
        strapi.notification.error('notification.error');
      }
    };

    if (!isLoadingForPermissions) {
      getData();
    }
  }, [isLoadingForPermissions]);

  const formToRender = useMemo(() => {
    return providerToEditName === 'email' ? forms.email : forms.providers;
  }, [providerToEditName]);

  const handleClick = useCallback(() => {
    buttonSubmitRef.current.click();
  }, []);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClickEdit = useCallback(
    provider => {
      setProviderToEditName(provider.name);
      handleToggle();
    },
    [handleToggle]
  );

  const handleChange = useCallback(({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  }, []);

  const handleClosed = useCallback(() => {
    setProviderToEditName(null);
    setShowForm(false);
    dispatch({
      type: 'RESET_FORM',
    });
  }, []);

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

        try {
          await request(getRequestURL('providers'), {
            method: 'PUT',
            body: { providers: modifiedData },
          });

          strapi.notification.success(getTrad('notification.success.submit'));

          dispatch({ type: 'ON_SUBMIT_SUCCEEDED' });

          handleToggle();
        } catch (err) {
          console.error(err);
          strapi.notification.error('notification.error');
        }
      } catch (err) {
        console.error(err);
        errors = getYupInnerErrors(err);
        console.log(errors);
      }

      dispatch({
        type: 'SET_ERRORS',
        errors,
      });

      setIsSubmiting(false);
    },
    [formToRender, handleToggle, modifiedData, providerToEditName]
  );

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <Header title={{ label: pageTitle }} isLoading={isLoadingForPermissions || isLoading} />
        <ListBaselineAlignment />
        <List
          title={listTitle}
          items={providers}
          isLoading={isLoadingForPermissions || isLoading}
          customRowComponent={provider => (
            <ListRow
              {...provider}
              onClick={() => {
                handleClickEdit(provider);
              }}
              links={[
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => {
                    handleClickEdit(provider);
                  },
                },
              ]}
            >
              <td key="enabled">
                <Text
                  fontWeight="semiBold"
                  lineHeight="18px"
                  color={provider.enabled ? 'green' : 'lightOrange'}
                >
                  {provider.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </td>
            </ListRow>
          )}
        />
      </div>
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
    </>
  );
};

export default ProvidersPage;
