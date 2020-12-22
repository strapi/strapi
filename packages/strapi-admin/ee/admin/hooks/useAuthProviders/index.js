import { useReducer, useEffect } from 'react';
// import { request } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';

const useAuthProviders = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    fetchAuthProviders();
  }, []);

  const fetchAuthProviders = async () => {
    try {
      // const { data } = await request('/admin/providers', { method: 'GET' });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        providers: [
          {
            id: 1,
            displayName: 'OKTA',
            uid: 'okta',
            icon: 'https://www.okta.com/themes/custom/okta_www_theme/images/logo.svg',
          },
          {
            id: 2,
            uid: 'azure',
            displayName: 'Microsoft Azure provider long name to handle ellipsis',
          },
          {
            id: 4,
            uid: 'active-directory',
            displayName: 'Active Directory',
            icon:
              'https://www.4me.com/wp-content/uploads/2018/08/4me-icon-azure-active-directory.png',
          },
          {
            id: 5,
            uid: 'ldap',
            displayName: 'LDAP',
          },
          {
            id: 6,
            uid: 'bearer',
            displayName: 'Bearer',
            icon:
              'https://uploads-ssl.webflow.com/5e319a299de0e7621ebe8cf9/5e319a83ec5266b90078cce8_bearer%20sticker%20logo.svg',
          },
        ],
      });
    } catch (err) {
      console.error(err);

      dispatch({
        type: 'GET_DATA_ERROR',
      });
      strapi.notification.toggle({
        type: 'warning',
        message: { id: 'notification.error' },
        centered: true,
      });
    }
  };

  return state;
};

export default useAuthProviders;
