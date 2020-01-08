/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { cloneDeep, get, isEmpty, isEqual, set } from 'lodash';
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
import { createYupSchema, createYupSchemaEntry } from './utils/schema';

import Inputs from '../../../components/Inputs';
import TriggerContainer from '../../../components/TriggerContainer';
import Wrapper from './Wrapper';

function EditView() {
  const { formatMessage } = useGlobalContext();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const location = useLocation();
  const { goBack, push } = useHistory();

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
  const isCreatingWebhook = id === 'create';

  const abortController = new AbortController();

  const { signal } = abortController;

  useEffect(() => {
    if (!isCreatingWebhook || (!isCreatingWebhook && shouldRefetchData)) {
      fetchData();
    }
  }, [fetchData, isCreatingWebhook, shouldRefetchData]);

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

  const actionsAreDisabled =
    isEqual(initialWebhook, modifiedWebhook) ||
    Object.keys(formErrors).length > 0;

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

  const handleBlur = ({ target }) => {
    if (submittedOnce) checkFormError(target);
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
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmittedOnce(true);
    checkFormErrors();
  };

  const submitForm = () => {
    if (!isCreatingWebhook) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const checkFormError = async target => {
    const { name, value } = target;
    const { type, validations } = form[name];

    try {
      await createYupSchemaEntry(type, validations).validate(value);

      resetError(name);
    } catch (err) {
      setError(err.message, name);
    }
  };

  const checkFormErrors = async () => {
    const webhookToCheck = cloneDeep(modifiedWebhook);
    set(webhookToCheck, 'headers', cleanHeaders());

    try {
      await createYupSchema(form).validate(webhookToCheck, {
        abortEarly: false,
      });

      resetErrors();
      submitForm();
    } catch (err) {
      strapi.notification.error('notification.form.error.fields');

      const errors = getYupInnerErrors(err);
      setErrors(errors);
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

  const resetError = name => {
    const errors = formErrors;

    if (errors[name]) {
      delete errors[name];
      resetErrors(errors);
    }
  };

  const resetErrors = (errors = null) => {
    dispatch({
      type: 'SET_ERRORS',
      errors: errors,
    });
  };

  const setError = (error, name) => {
    const errors = formErrors;
    set(errors, name, { id: error });
    setErrors(errors);
  };

  const setErrors = errors => {
    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  const formatWebhook = () => {
    const webhooks = cloneDeep(modifiedWebhook);
    set(webhooks, 'headers', unformatLayout(cleanHeaders()));
    return webhooks;
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
  const unformatLayout = headers => {
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
      <BackHeader onClick={() => push('/settings/webhooks')} />
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
                      error={get(formErrors, [key, 'id'], null)}
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
