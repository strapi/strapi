/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { cloneDeep, isEmpty, isEqual, set } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import { request, useGlobalContext } from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';
import form from './utils/form';

import Inputs from '../../../components/Inputs';
import TriggerContainer from '../../../components/TriggerContainer';
import Wrapper from './Wrapper';

function EditView() {
  const { formatMessage } = useGlobalContext();
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const location = useLocation();
  const { goBack } = useHistory();

  const {
    modifiedWebhook,
    initialWebhook,
    isTriggering,
    triggerResponse,
    shouldRefetchData,
  } = reducerState.toJS();

  const { name } = modifiedWebhook;

  const id = location.pathname.split('/')[3];
  const isCreatingWebhook = id === 'create';

  const abortController = new AbortController();

  const { signal } = abortController;

  useEffect(() => {
    if (!isCreatingWebhook) {
      fetchData();
    }
  }, [fetchData, isCreatingWebhook]);

  useEffect(() => {
    if (shouldRefetchData) {
      fetchData();
    }
  }, [fetchData, shouldRefetchData]);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await request(`/admin/webhooks/${id}`, {
        method: 'GET',
      });

      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  }, [id]);

  // Header props
  const headerTitle = isCreatingWebhook
    ? formatMessage({
        id: `Settings.webhooks.create`,
      })
    : name;

  const actionsAreDisabled = isEqual(initialWebhook, modifiedWebhook);
  const triggerActionIsDisabled =
    isCreatingWebhook || (!isCreatingWebhook && !actionsAreDisabled);

  const handleTrigger = async () => {
    dispatch({
      type: 'ON_TRIGGER',
    });

    try {
      const { data } = await request(`/admin/webhooks/${id}/trigger`, {
        method: 'POST',
        signal,
      });

      dispatch({
        type: 'TRIGGER_SUCCEEDED',
        response: data,
      });
    } catch (err) {
      if (err.code !== 20) {
        strapi.notification.error('notification.error');
      }
    }
  };

  const onCancelTrigger = () => {
    console.log('abort');
    abortController.abort();

    dispatch({
      type: 'ON_TRIGGER_CANCELED',
    });
  };

  const handleReset = () => {
    dispatch({
      type: 'RESET',
    });
  };

  const actions = [
    {
      color: 'primary',
      disabled: triggerActionIsDisabled,
      type: 'button',
      label: formatMessage({
        id: `Settings.webhooks.trigger`,
      }),
      onClick: () => {
        handleTrigger();
      },
      style: {
        paddingRight: 15,
        paddingLeft: 15,
      },
      title: triggerActionIsDisabled
        ? formatMessage({
            id: `Settings.webhooks.trigger.save`,
          })
        : null,
      icon: (
        <Play
          width="6px"
          height="7px"
          fill={triggerActionIsDisabled ? '#b4b6ba' : '#ffffff'}
        />
      ),
    },
    {
      onClick: () => {
        handleReset();
      },
      color: 'cancel',
      disabled: actionsAreDisabled,
      type: 'button',
      label: formatMessage({
        id: `app.components.Button.reset`,
      }),
      style: {
        paddingRight: 20,
        paddingLeft: 20,
      },
    },
    {
      color: 'success',
      disabled: actionsAreDisabled,
      type: 'submit',
      label: formatMessage({
        id: `app.components.Button.save`,
      }),
      style: {
        minWidth: 140,
      },
    },
  ];
  const headerProps = {
    title: {
      label: headerTitle,
    },
    actions: actions,
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });
  };

  const handleClick = () => {
    dispatch({
      type: 'ADD_NEW_HEADER',
      keys: ['headers'],
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!isCreatingWebhook) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const createWebhooks = async () => {
    const body = cloneDeep(modifiedWebhook);
    set(body, 'headers', unformatLayout(modifiedWebhook.headers));

    try {
      const body = cloneDeep(modifiedWebhook);
      set(body, 'headers', unformatLayout(modifiedWebhook.headers));

      await request(`/admin/webhooks`, {
        method: 'POST',
        body,
      });

      strapi.notification.success(`app.notification.success`);
      goBack();
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const updateWebhook = async () => {
    const body = cloneDeep(modifiedWebhook);
    set(body, 'headers', unformatLayout(modifiedWebhook.headers));

    try {
      const body = cloneDeep(modifiedWebhook);
      set(body, 'headers', unformatLayout(modifiedWebhook.headers));
      delete body.id;

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      strapi.notification.success(`app.notification.success`);
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  // utils
  const unformatLayout = headers => {
    if (headers.length === 1) {
      const { key, value } = headers[0];
      if ((key === '') & (value === '')) {
        return {};
      }
    }

    const newHeader = headers.reduce((obj, item) => {
      const { key, value } = item;
      return {
        ...obj,
        [key]: value,
      };
    }, {});

    return newHeader;
  };

  const handleBlur = async ({ target }) => {
    if (canCheck) {
      try {
        await createYupSchema(type, validations, translatedErrors).validate(
          target.value
        );
        resetError();
      } catch (err) {
        const { message } = err;
        setError(message);
      }
    }
  };

  return (
    <Wrapper>
      <form onSubmit={handleSubmit}>
        <Header {...headerProps} />
        {(isTriggering || !isEmpty(triggerResponse)) && (
          <div className="trigger-wrapper">
            <TriggerContainer
              isPending={isTriggering}
              response={triggerResponse}
              onCancel={onCancelTrigger}
            />
          </div>
        )}
        <div className="form-wrapper">
          <div className="form-card">
            <div className="row">
              {Object.keys(form).map(key => {
                return (
                  <div key={key} className={form[key].styleName}>
                    <Inputs
                      {...form[key]}
                      // customInputs={{
                      //   headers: HeadersInput,
                      // }}
                      name={key}
                      //onBlur={handleBlur}
                      onChange={handleChange}
                      onClick={handleClick}
                      validations={form[key].validations}
                      value={modifiedWebhook[key] || form[key].value}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Wrapper>
  );
}

export default EditView;
