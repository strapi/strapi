/**
 *
 * EditView
 *
 */

import React, { useEffect, useReducer, useCallback, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { get, isEmpty, isEqual, set } from 'lodash';
import { Header, Inputs as InputsIndex } from '@buffetjs/custom';
import { Play } from '@buffetjs/icons';
import {
  request,
  useGlobalContext,
  getYupInnerErrors,
  BackHeader,
} from 'strapi-helper-plugin';

import Inputs from '../../../components/Inputs';
import TriggerContainer from '../../../components/TriggerContainer';

import reducer, { initialState } from './reducer';
import form from './utils/form';
import schema from './utils/schema';
import { cleanHeaders, cleanData, cleanErrors } from './utils/formatData';

import Wrapper from './Wrapper';

function EditView() {
  const { formatMessage } = useGlobalContext();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [reducerState, dispatch] = useReducer(reducer, initialState);
  const { push } = useHistory();

  const {
    formErrors,
    modifiedData,
    initialData,
    isTriggering,
    triggerResponse,
  } = reducerState.toJS();

  const { name } = modifiedData;
  const { id } = useParams();
  const isCreating = id === 'create';

  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    if (!isCreating) {
      fetchData();

      return () => {
        abortController.abort();
      };
    }
  }, [abortController, fetchData, isCreating]);

  /* Header props */

  const areActionDisabled =
    isEqual(initialData, modifiedData) || Object.keys(formErrors).length > 0;

  const headerTitle = isCreating
    ? formatMessage({
        id: `Settings.webhooks.create`,
      })
    : name;

  const isTriggerActionDisabled =
    isCreating || (!isCreating && !areActionDisabled) || isTriggering;

  const actions = [
    {
      color: 'primary',
      disabled: isTriggerActionDisabled,
      label: formatMessage({
        id: `Settings.webhooks.trigger`,
      }),
      onClick: handleTrigger,
      style: {
        padding: '0 15px',
      },
      title: isTriggerActionDisabled
        ? formatMessage({
            id: `Settings.webhooks.trigger.save`,
          })
        : null,
      type: 'button',
      icon: (
        <Play
          width="14px"
          height="14px"
          fill={isTriggerActionDisabled ? '#b4b6ba' : '#ffffff'}
        />
      ),
    },
    {
      color: 'cancel',
      disabled: areActionDisabled,
      label: formatMessage({
        id: `app.components.Button.reset`,
      }),
      onClick: handleReset,
      style: {
        padding: '0 20px',
      },
      type: 'button',
    },
    {
      color: 'success',
      disabled: areActionDisabled,
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

  /* Data methods */

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

  const submitForm = () => {
    if (!isCreating) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const createWebhooks = async () => {
    try {
      await request(`/admin/webhooks`, {
        method: 'POST',
        body: cleanData(modifiedData),
      });

      strapi.notification.success(`notification.success`);
      goBack();
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  const updateWebhook = async () => {
    try {
      const body = cleanData(modifiedData);
      delete body.id;

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });

      fetchData();

      strapi.notification.error('notification.form.success.fields');
    } catch (err) {
      strapi.notification.error('notification.error');
    }
  };

  /* Form user interactions */

  const handleReset = () =>
    dispatch({
      type: 'RESET_FORM',
    });

  const handleBlur = () => {
    if (submittedOnce) {
      checkFormErrors();
    }
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

  const handleRemove = index => {
    dispatch({
      type: 'ON_HEADER_REMOVE',
      index,
    });
    resetError('headers');
  };

  const handleSubmit = e => {
    e.preventDefault();
    setSubmittedOnce(true);
    checkFormErrors(true);
  };

  /* Validations */

  const checkFormErrors = async (submit = false) => {
    const webhookToCheck = modifiedData;
    set(webhookToCheck, 'headers', cleanHeaders(modifiedData.headers));

    try {
      await schema.validate(webhookToCheck, {
        abortEarly: false,
      });

      setErrors({});
      if (submit) submitForm();
    } catch (err) {
      setErrors(getYupInnerErrors(err));
      if (submit) strapi.notification.error('notification.form.error.fields');
    }
  };

  const resetError = name => {
    const errors = formErrors;

    if (errors[name]) {
      delete errors[name];
      setErrors(errors);
    }
  };

  const setErrors = errors => {
    dispatch({
      type: 'SET_ERRORS',
      errors: cleanErrors(errors),
    });
  };

  const errorMessage = error => {
    if (!error) {
      return null;
    }
    if (typeof error === 'string') {
      return formatMessage({
        id: error,
      });
    }
    return error;
  };

  /* Trigger events */

  const handleTrigger = async () => {
    dispatch({
      type: 'IS_TRIGGERING',
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
      dispatch({
        type: 'IS_TRIGGERING',
      });
    }
  };

  const onCancelTrigger = () => {
    abortController.abort();

    dispatch({
      type: 'ON_TRIGGER_CANCELED',
    });
  };

  /* Nav */

  const goBack = () => push('/settings/webhooks');

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
                    <InputsIndex
                      {...form[key]}
                      customInputs={{
                        headers: Inputs,
                        events: Inputs,
                      }}
                      error={errorMessage(get(formErrors, key, null))}
                      name={key}
                      onBlur={handleBlur}
                      onChange={handleChange}
                      validations={form[key].validations}
                      value={modifiedData[key] || form[key].value}
                      {...(form[key].type === 'headers' && {
                        onClick: handleClick,
                        onRemove: handleRemove,
                      })}
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
