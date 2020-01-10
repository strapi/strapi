/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { get, isEmpty, isEqual, set, setWith } from 'lodash';
import { Header } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import {
  request,
  useGlobalContext,
  getYupInnerErrors,
  BackHeader,
} from 'strapi-helper-plugin';

import reducer, { initialState } from './reducer';
import form from './utils/form';
import createYupSchema from './utils/schema';

import Inputs from '../../../components/Inputs';
import TriggerContainer from '../../../components/TriggerContainer';
import Wrapper from './Wrapper';

function EditView() {
  const { formatMessage } = useGlobalContext();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const location = useLocation();
  const { push } = useHistory();

  const {
    formErrors,
    modifiedWebhook,
    initialWebhook,
    isTriggering,
    triggerResponse,
    shouldRefetchData,
  } = reducerState.toJS();

  const { name } = modifiedWebhook;

  const id = location.pathname.split('/')[3];
  const isCreating = id === 'create';

  const abortController = new AbortController();

  const { signal } = abortController;

  useEffect(() => {
    if (!isCreating || (!isCreating && shouldRefetchData)) {
      fetchData();
    }
  }, [fetchData, isCreating, shouldRefetchData]);

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

  const headerTitle = isCreating
    ? formatMessage({
        id: `Settings.webhooks.create`,
      })
    : name;

  const actionsAreDisabled =
    isEqual(initialWebhook, modifiedWebhook) ||
    Object.keys(formErrors).length > 0;

  const triggerActionIsDisabled =
    isCreating || (!isCreating && !actionsAreDisabled);

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
    abortController.abort();

    dispatch({
      type: 'ON_TRIGGER_CANCELED',
    });
  };

  const handleReset = () =>
    dispatch({
      type: 'RESET',
    });

  const actions = [
    {
      color: 'primary',
      disabled: triggerActionIsDisabled,
      label: formatMessage({
        id: `Settings.webhooks.trigger`,
      }),
      onClick: () => {
        handleTrigger();
      },
      style: {
        padding: '0 15px',
      },
      title: triggerActionIsDisabled
        ? formatMessage({
            id: `Settings.webhooks.trigger.save`,
          })
        : null,
      type: 'button',
      icon: (
        <Play
          width="6px"
          height="7px"
          fill={triggerActionIsDisabled ? '#b4b6ba' : '#ffffff'}
        />
      ),
    },
    {
      color: 'cancel',
      disabled: actionsAreDisabled,
      label: formatMessage({
        id: `app.components.Button.reset`,
      }),
      onClick: () => handleReset(),
      style: {
        padding: '0 20px',
      },
      type: 'button',
    },
    {
      color: 'success',
      disabled: actionsAreDisabled,
      label: formatMessage({
        id: `app.components.Button.save`,
      }),
      style: {
        minWidth: 140,
      },
      type: 'submit',
    },
  ];

  const headerProps = {
    title: {
      label: headerTitle,
    },
    actions: actions,
  };

  const handleBlur = () => {
    if (submittedOnce) checkFormErrors();
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

  const handleRemove = ({ event, index }) => {
    dispatch({
      type: 'ON_HEADER_REMOVE',
      index,
      event,
    });
    resetError('headers');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmittedOnce(true);
    checkFormErrors(true);
  };

  const submitForm = () => {
    if (!isCreating) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const checkFormErrors = async (submit = false) => {
    const webhookToCheck = modifiedWebhook;
    set(webhookToCheck, 'headers', cleanHeaders());

    try {
      await createYupSchema(form).validate(webhookToCheck, {
        abortEarly: false,
      });

      setErrors({});
      if (submit) submitForm();
    } catch (err) {
      setErrors(getYupInnerErrors(err));
      if (submit) strapi.notification.error('notification.form.error.fields');
    }
  };

  const cleanHeaders = () => {
    const { headers } = modifiedWebhook;

    if (Object.keys(headers).length === 1) {
      const { key, value } = headers[0];
      if (key.length === 0 && value.length === 0) return [];
    }
    return headers;
  };

  const goBack = () => push('/settings/webhooks');

  const resetError = name => {
    const errors = formErrors;

    if (errors[name]) {
      delete errors[name];
      setErrors(errors);
    }
  };

  const setErrors = errors => {
    const newErrors = Object.keys(errors).reduce((acc, curr) => {
      const { id } = errors[curr];

      setWith(acc, curr, id ? id : errors[curr], Object);

      return acc;
    }, {});

    dispatch({
      type: 'SET_ERRORS',
      errors: newErrors,
    });
  };

  const createWebhooks = async () => {
    try {
      await request(`/admin/webhooks`, {
        method: 'POST',
        body: formatWebhook(),
      });

      strapi.notification.success(`notification.success`);
      goBack();
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const updateWebhook = async () => {
    try {
      const body = formatWebhook();
      delete body.id;

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      strapi.notification.error('notification.form.success.fields');
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  // utils
  const formatWebhook = () => {
    const webhooks = modifiedWebhook;
    set(webhooks, 'headers', unformatHeaders(cleanHeaders()));
    return webhooks;
  };

  const unformatHeaders = headers => {
    return headers.reduce((obj, item) => {
      const { key, value } = item;
      return {
        ...obj,
        [key]: value,
      };
    }, {});
  };

  return (
    <Wrapper>
      <BackHeader onClick={goBack} />
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
                      error={get(formErrors, key, null)}
                      name={key}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      onClick={handleClick}
                      onRemove={handleRemove}
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
