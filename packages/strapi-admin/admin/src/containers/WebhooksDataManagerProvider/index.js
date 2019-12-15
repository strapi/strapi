import React, { useEffect, useReducer, memo } from 'react';
import PropTypes from 'prop-types';
//import { request } from 'strapi-helper-plugin';
import WebhooksDataManagerContext from '../../contexts/WebhooksDataManager';
import init from './init';
import reducer, { initialState } from './reducer';

const WebhooksDataManagerProvider = ({ children }) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, init);
  const { webhooks } = reducerState.toJS();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // const { data } = await request(`/admin/webhooks`, {
        //   method: 'GET',
        // });

        const list = [
          {
            id: 0,
            name: 'gatsby',
            isEnabled: false,
            url: 'http://thisisanexample.com/1234867874',
            headers: {
              Authorisation: 'x-secret',
            },
            hooks: ['createEntry', 'editEntry', 'deleteEntry', 'createMedia'],
            links: [
              {
                icon: 'pencil',
                onClick: () => {
                  console.log('edit');
                },
              },
              {
                icon: 'trash',
                onClick: () => {
                  console.log('delete');
                },
              },
            ],
          },
          {
            id: 1,
            name: 'gatsby',
            isEnabled: false,
            url: 'http://thisisanexample.com/1234867874',
            headers: {
              Authorisation: 'x-secret',
            },
            hooks: ['createEntry', 'editEntry', 'deleteEntry', 'createMedia'],
            links: [
              {
                icon: 'pencil',
                onClick: () => {
                  console.log('edit');
                },
              },
              {
                icon: 'trash',
                onClick: () => {
                  console.log('delete');
                },
              },
            ],
          },
        ];

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data: list,
        });
      } catch (err) {
        if (err.code !== 20) {
          strapi.notification.error('notification.error');
        }
      }
    };

    fetchData();
  }, []);

  return (
    <WebhooksDataManagerContext.Provider
      value={{
        webhooks,
      }}
    >
      {children}
    </WebhooksDataManagerContext.Provider>
  );
};

WebhooksDataManagerProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default memo(WebhooksDataManagerProvider);
