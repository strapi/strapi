import React, { useReducer, useState } from 'react';

import {
  ConfirmDialog,
  useTracking,
  useNotification,
  Page,
  Layouts,
} from '@strapi/admin/strapi-admin';
import { Button, Dialog, Link } from '@strapi/design-system';
import { ArrowLeft, Check } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useConfig } from '../../../hooks/useConfig';
import pluginID from '../../../pluginId';
import getTrad from '../../../utils/getTrad';

import { Settings } from './components/Settings';
import { onChange, setLoaded } from './state/actions';
import { init, initialState } from './state/init';
import reducer from './state/reducer';

const ConfigureTheView = ({ config }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { mutateConfig } = useConfig();
  const { isLoading: isSubmittingForm } = mutateConfig;

  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  const [reducerState, dispatch] = useReducer(reducer, initialState, () => init(config));
  const { initialData, modifiedData } = reducerState;

  const handleSubmit = (e) => {
    e.preventDefault();
    toggleWarningSubmit();
  };

  const handleConfirm = async () => {
    trackUsage('willEditMediaLibraryConfig');
    await mutateConfig.mutateAsync(modifiedData);
    setWarningSubmit(false);
    dispatch(setLoaded());
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'notification.form.success.fields',
        defaultMessage: 'Changes saved',
      }),
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch(onChange({ name, value }));
  };

  return (
    <Layouts.Root>
      <Page.Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <Layouts.Header
            navigationAction={
              <Link
                tag={NavLink}
                startIcon={<ArrowLeft />}
                to={`/plugins/${pluginID}`}
                id="go-back"
              >
                {formatMessage({ id: getTrad('config.back'), defaultMessage: 'Back' })}
              </Link>
            }
            primaryAction={
              <Button
                size="S"
                startIcon={<Check />}
                disabled={isEqual(modifiedData, initialData)}
                type="submit"
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
            subtitle={formatMessage({
              id: getTrad('config.subtitle'),
              defaultMessage: 'Define the view settings of the media library.',
            })}
            title={formatMessage({
              id: getTrad('config.title'),
              defaultMessage: 'Configure the view - Media Library',
            })}
          />

          <Layouts.Content>
            <Settings
              data-testid="settings"
              pageSize={modifiedData.pageSize || ''}
              sort={modifiedData.sort || ''}
              onChange={handleChange}
            />
          </Layouts.Content>

          <Dialog.Root open={showWarningSubmit} onOpenChange={toggleWarningSubmit}>
            <ConfirmDialog onConfirm={handleConfirm} variant="default">
              {formatMessage({
                id: getTrad('config.popUpWarning.warning.updateAllSettings'),
                defaultMessage: 'This will modify all your settings',
              })}
            </ConfirmDialog>
          </Dialog.Root>
        </form>
      </Page.Main>
    </Layouts.Root>
  );
};

ConfigureTheView.propTypes = {
  config: PropTypes.shape({
    pageSize: PropTypes.number,
    sort: PropTypes.string,
  }).isRequired,
};

export default ConfigureTheView;
