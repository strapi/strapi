/**
 *
 * EditView
 *
 */

import { Inputs as InputsIndex } from '@buffetjs/custom';
import {
  getYupInnerErrors,
  LoadingIndicatorPage,
  request,
  SettingsPageTitle,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { BackIcon, CheckIcon, Publish } from '@strapi/icons';
import { Button, HeaderLayout, Link, Main, Stack } from '@strapi/parts';
import { get, isEmpty, isEqual, omit } from 'lodash';
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory, useRouteMatch } from 'react-router-dom';
import { Inputs, TriggerContainer } from '../../../components/Webhooks';
import { useModels } from '../../../hooks';
import reducer, { initialState } from './reducer';
import { cleanData, form, schema } from './utils';

function EditView() {
  const { isLoading: isLoadingForModels, collectionTypes } = useModels();
  const toggleNotification = useNotification();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const isMounted = useRef();
  const { formatMessage } = useIntl();
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [
    { formErrors, modifiedData, initialData, isLoading, isTriggering, triggerResponse },
    dispatch,
  ] = useReducer(reducer, initialState);
  const { replace } = useHistory();
  const {
    params: { id },
  } = useRouteMatch('/settings/webhooks/:id');

  const abortController = new AbortController();
  const { signal } = abortController;
  const isCreating = id === 'create';

  useEffect(() => {
    isMounted.current = true;

    const fetchData = async () => {
      try {
        const { data } = await request(`/admin/webhooks/${id}`, {
          method: 'GET',
        });

        if (isMounted.current) {
          dispatch({
            type: 'GET_DATA_SUCCEEDED',
            data,
          });
        }
      } catch (err) {
        if (isMounted.current) {
          dispatch({ type: 'UNSET_LOADER' });

          if (err.code !== 20) {
            toggleNotification({
              type: 'warning',
              message: { id: 'notification.error' },
            });
          }
        }
      }
    };

    if (!isCreating) {
      fetchData();
    } else {
      dispatch({ type: 'UNSET_LOADER' });
    }

    return () => {
      isMounted.current = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCreating]);

  const areActionDisabled = isEqual(initialData, modifiedData);

  const isTriggerActionDisabled = isCreating || (!isCreating && !areActionDisabled) || isTriggering;

  const formattedErrors = Object.keys(formErrors)
    .filter(key => key.includes('headers'))
    .reduce((obj, key) => {
      obj[key] = formErrors[key];

      return obj;
    }, {});

  const checkFormErrors = async (submit = false) => {
    try {
      await schema.validate(modifiedData, { abortEarly: false });

      if (isMounted.current) {
        setErrors({});

        if (submit) {
          submitForm();
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setErrors(getYupInnerErrors(err));

        if (submit) {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.form.error.fields' },
          });
        }
      }
    }
  };

  const createWebhooks = async () => {
    try {
      lockApp();
      setIsSubmitting(true);

      const { data } = await request('/admin/webhooks', {
        method: 'POST',
        body: cleanData(modifiedData),
      });
      setIsSubmitting(false);
      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      toggleNotification({
        type: 'success',
        message: { id: 'Settings.webhooks.created' },
      });
      replace(`/settings/webhooks/${data.id}`);
    } catch (err) {
      setIsSubmitting(false);
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      unlockApp();
    }
  };

  const getErrorMessage = error => {
    if (!error) {
      return null;
    }

    return formatMessage({
      id: error.id,
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name.split('.'),
      value,
    });

    if (submittedOnce) {
      if (name === 'events') {
        resetEventsError();
      }
      if (name.includes('headers')) {
        resetHeadersError(name);
      }
    }
  };

  const handleClick = () => {
    dispatch({
      type: 'ADD_NEW_HEADER',
      keys: ['headers'],
    });
  };

  const handleTrigger = async () => {
    dispatch({
      type: 'SET_IS_TRIGGERING',
    });

    try {
      const { data } = await request(`/admin/webhooks/${id}/trigger`, {
        method: 'POST',
        signal,
      });

      if (isMounted.current) {
        dispatch({
          type: 'TRIGGER_SUCCEEDED',
          response: data,
        });
      }
    } catch (err) {
      if (isMounted.current) {
        if (err.code !== 20) {
          toggleNotification({
            type: 'warning',
            message: { id: 'notification.error' },
          });
        }
        dispatch({
          type: 'SET_IS_TRIGGERING',
        });
      }
    }
  };

  const handleRemove = index => {
    dispatch({
      type: 'ON_HEADER_REMOVE',
      index,
    });

    resetHeadersErrors();
  };

  const handleReset = () =>
    dispatch({
      type: 'RESET_FORM',
    });

  const handleSubmit = e => {
    e.preventDefault();
    setSubmittedOnce(true);
    checkFormErrors(true);
  };

  const onCancelTrigger = () => {
    abortController.abort();

    dispatch({
      type: 'ON_TRIGGER_CANCELED',
    });
  };

  const resetEventsError = () => {
    const errors = formErrors;
    delete errors.events;
    setErrors(errors);
  };

  const resetHeadersError = keys => {
    const errors = formErrors;

    setErrors(omit(errors, [keys]));
  };

  const resetHeadersErrors = () => {
    const errors = formErrors;
    const newErrors = Object.keys(errors)
      .filter(key => !key.includes('headers'))
      .reduce((obj, key) => {
        obj[key] = formErrors[key];

        return obj;
      }, {});

    setErrors(newErrors);
  };

  const setErrors = errors => {
    dispatch({
      type: 'SET_ERRORS',
      errors,
    });
  };

  const submitForm = () => {
    if (!isCreating) {
      updateWebhook();
    } else {
      createWebhooks();
    }
  };

  const updateWebhook = async () => {
    try {
      lockApp();
      setIsSubmitting(true);

      const body = cleanData(modifiedData);
      delete body.id;

      await request(`/admin/webhooks/${id}`, {
        method: 'PUT',
        body,
      });
      setIsSubmitting(false);
      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });
      toggleNotification({
        type: 'success',
        message: { id: 'notification.form.success.fields' },
      });
    } catch (err) {
      setIsSubmitting(false);
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    } finally {
      unlockApp();
    }
  };

  const shouldShowDPEvents = useMemo(
    () => collectionTypes.some(ct => ct.options.draftAndPublish === true),
    [collectionTypes]
  );

  if (isLoading || isLoadingForModels) {
    return <LoadingIndicatorPage />;
  }

  console.log(form);

  return (
    <Main labelledBy="title">
      <SettingsPageTitle name="Webhooks" />
      <HeaderLayout
        id="title"
        primaryAction={
          <Stack horizontal size={2}>
            <Button
              onClick={handleTrigger}
              variant="tertiary"
              startIcon={<Publish />}
              disabled={isTriggerActionDisabled}
            >
              {formatMessage({
                id: 'Settings.webhooks.trigger',
                defaultMessage: 'Trigger',
              })}
            </Button>
            <Button variant="secondary" onClick={handleReset}>
              {formatMessage({
                id: 'app.components.Button.reset',
                defaultMessage: 'Reset',
              })}
            </Button>
            <Button startIcon={<CheckIcon />} onClick={handleSubmit} loading={isSubmitting}>
              {formatMessage({
                id: 'app.components.Button.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Stack>
        }
        title={
          isCreating
            ? formatMessage({
                id: 'Settings.webhooks.create',
                defaultMessage: 'Create a webhook',
              })
            : initialData.name
        }
        navigationAction={
          <Link startIcon={<BackIcon />} to="/settings/webhooks">
            Go back
          </Link>
        }
        as="h1"
      />
      <form onSubmit={handleSubmit}>
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
                      label={formatMessage({
                        id: form[key].label,
                      })}
                      error={getErrorMessage(get(formErrors, key, null))}
                      name={key}
                      onChange={handleChange}
                      shouldShowDPEvents={shouldShowDPEvents}
                      validations={form[key].validations}
                      value={modifiedData[key] || form[key].value}
                      {...(form[key].type === 'headers' && {
                        onClick: handleClick,
                        onRemove: handleRemove,
                        customError: formattedErrors,
                      })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </Main>
  );
}

export default EditView;
