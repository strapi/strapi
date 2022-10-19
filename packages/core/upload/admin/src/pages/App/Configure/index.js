import React, { memo, useState, useReducer } from 'react';
import { useIntl } from 'react-intl';
import isEqual from 'lodash/isEqual';
import PropTypes from 'prop-types';

import { Layout, HeaderLayout, ContentLayout } from '@strapi/design-system/Layout';
import { useNotification, ConfirmDialog, Link, useTracking } from '@strapi/helper-plugin';
import Check from '@strapi/icons/Check';
import { Button } from '@strapi/design-system/Button';
import ArrowLeft from '@strapi/icons/ArrowLeft';
import { Main } from '@strapi/design-system/Main';
import Settings from './components/Settings';

import reducer, { initialState } from './state/reducer';
import init from './state/init';
import { onChange, setLoaded } from './state/actions';

import pluginID from '../../../pluginId';
import getTrad from '../../../utils/getTrad';
import { useConfig } from '../../../hooks/useConfig';

const ConfigureMediaLibrary = ({ configData }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const {
    put: { request: putMutation, isLoading: isSubmittingForm },
  } = useConfig();

  const [showWarningSubmit, setWarningSubmit] = useState(false);
  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  const [reducerState, dispatch] = useReducer(reducer, initialState, () => init(configData.data));
  const { initialData, modifiedData } = reducerState;

  const handleSubmit = (e) => {
    e.preventDefault();
    toggleWarningSubmit();
    trackUsage('willSaveMediaLibrarySettings');
  };

  const handleConfirm = () => {
    toggleWarningSubmit();
    putMutation(modifiedData);
    dispatch(setLoaded());
    toggleNotification({
      type: 'success',
      message: { id: 'notification.form.success.fields' },
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch(onChange({ name, value }));
  };

  return (
    <Layout>
      <Main aria-busy={isSubmittingForm}>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            navigationAction={
              <Link startIcon={<ArrowLeft />} to={`/plugins/${pluginID}`} id="go-back">
                {formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
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
              // TODO define translations for ML
              id: getTrad('FIXME'),
              defaultMessage: 'Define the settings of the media library.',
            })}
            title={formatMessage({
              id: getTrad('FIXME'),
              defaultMessage: 'Configure the view - Media Library',
            })}
          />

          <ContentLayout>
            <Settings pageSize={modifiedData.pageSize || ''} onChange={handleChange} />
          </ContentLayout>

          <ConfirmDialog
            bodyText={{
              id: getTrad('popUpWarning.warning.updateAllSettings'),
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

ConfigureMediaLibrary.propTypes = {
  configData: PropTypes.object.isRequired,
};
export default memo(ConfigureMediaLibrary);
