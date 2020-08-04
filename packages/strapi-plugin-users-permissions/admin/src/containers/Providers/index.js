import React, { useEffect, useMemo, useReducer } from 'react';
import { useIntl } from 'react-intl';
import { Header, List } from '@buffetjs/custom';
import { Text } from '@buffetjs/core';
import { Pencil } from '@buffetjs/icons';
import { SettingsPageTitle, useUserPermissions, request } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import { getRequestURL, getTrad } from '../../utils';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import ListRow from '../../components/ListRow';
import reducer, { initialState } from './reducer';

const ProvidersPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.providers') });
  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateProviders };
  }, [pluginPermissions]);
  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useUserPermissions(updatePermissions);
  const [{ isLoading, providers }, dispatch] = useReducer(reducer, initialState);
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
  }, [formatMessage, enabledProvidersCount]);

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL('providers'), { method: 'GET' });

        console.log({ data });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
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

  return (
    <>
      <SettingsPageTitle name={pageTitle} />
      <div>
        <Header title={{ label: pageTitle }} isLoading={isLoadingForPermissions || isLoading} />
        <ListBaselineAlignment />
        <List
          title={listTitle}
          items={providers}
          isLoading={isLoading}
          customRowComponent={provider => (
            <ListRow
              {...provider}
              onClick={() => {
                console.log(`Will edit ${provider.name}`);
              }}
              links={[
                {
                  icon: canUpdate ? <Pencil fill="#0e1622" /> : null,
                  onClick: () => {
                    console.log(`Will edit ${provider.name}`);
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
    </>
  );
};

export default ProvidersPage;
