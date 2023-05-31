import React, { useState, useReducer } from 'react';
import { useIntl } from 'react-intl';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';

import { Layout, HeaderLayout, ContentLayout, Button, Main } from '@strapi/design-system';
import {
  useNotification,
  ConfirmDialog,
  Link,
  useTracking,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { Check, ArrowLeft } from '@strapi/icons';
import { Settings } from './components/Settings';

import reducer from './state/reducer';
import { init, initialState } from './state/init';
import { onChange, setLoaded } from './state/actions';

import pluginID from '../../../pluginId';
import getTrad from '../../../utils/getTrad';
import { useConfig } from '../../../hooks/useConfig';

const ConfigureTheView = ({ config }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
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
    toggleWarningSubmit();
    dispatch(setLoaded());
    toggleNotification({
      type: 'success',
      message: {
        id: 'notification.form.success.fields',
        defaultMessage: 'Changes saved',
      },
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch(onChange({ name, value }));
  };

  useFocusWhenNavigate();

  return (
    <Layout>
      <Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            navigationAction={
              <Link startIcon={<ArrowLeft />} to={`/plugins/${pluginID}`} id="go-back">
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

          <ContentLayout>
            <Settings
              data-testid="settings"
              pageSize={modifiedData.pageSize || ''}
              sort={modifiedData.sort || ''}
              onChange={handleChange}
            />
          </ContentLayout>

          <ConfirmDialog
            bodyText={{
              id: getTrad('config.popUpWarning.warning.updateAllSettings'),
              defaultMessage: 'This will modify all your settings',
            }}
            iconRightButton={<Check />}
            isConfirmButtonLoading={isSubmittingForm}
            isOpen={showWarningSubmit}
            onToggleDialog={toggleWarningSubmit}
            onConfirm={handleConfirm}
            variantRightButton="success-light"
          />
        </form>
      </Main>
    </Layout>
  );
};

ConfigureTheView.propTypes = {
  config: PropTypes.shape({
    pageSize: PropTypes.number,
    sort: PropTypes.string,
  }).isRequired,
};

export default ConfigureTheView;
