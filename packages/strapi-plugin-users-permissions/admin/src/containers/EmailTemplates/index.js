import React, { useEffect, useMemo, useReducer } from 'react';
import { useIntl } from 'react-intl';
import { Header, List } from '@buffetjs/custom';
import { Pencil } from '@buffetjs/icons';
import { SettingsPageTitle, useUserPermissions, request } from 'strapi-helper-plugin';
import pluginPermissions from '../../permissions';
import ListBaselineAlignment from '../../components/ListBaselineAlignment';
import ListRow from '../../components/ListRow';
import { getRequestURL, getTrad } from '../../utils';
import reducer, { initialState } from './reducer';

const EmailTemplatesPage = () => {
  const { formatMessage } = useIntl();
  const pageTitle = formatMessage({ id: getTrad('HeaderNav.link.emailTemplates') });
  const updatePermissions = useMemo(() => {
    return { update: pluginPermissions.updateEmailTemplates };
  }, []);
  const [{ isLoading, modifiedData }, dispatch] = useReducer(reducer, initialState);
  const emailTemplates = useMemo(() => {
    return Object.keys(modifiedData).reduce((acc, current) => {
      const { display, icon } = modifiedData[current];

      acc.push({ name: formatMessage({ id: getTrad(display) }), icon: ['fas', icon] });

      return acc;
    }, []);
  }, [modifiedData, formatMessage]);

  const {
    isLoading: isLoadingForPermissions,
    allowedActions: { canUpdate },
  } = useUserPermissions(updatePermissions);
  const listTitle = useMemo(() => {
    const count = emailTemplates.length;

    return formatMessage(
      {
        id: getTrad(`List.title.emailTemplates.${count > 1 ? 'plural' : 'singular'}`),
      },
      { number: count }
    );
  }, [emailTemplates.length, formatMessage]);

  useEffect(() => {
    const getData = async () => {
      try {
        dispatch({
          type: 'GET_DATA',
        });

        const data = await request(getRequestURL('email-templates'), { method: 'GET' });

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
          items={emailTemplates}
          isLoading={isLoadingForPermissions || isLoading}
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
            />
          )}
        />
      </div>
    </>
  );
};

export default EmailTemplatesPage;
