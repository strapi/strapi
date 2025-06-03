// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

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
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { useConfig } from '../../../hooks/useConfig';
import { pluginId } from '../../../pluginId';
import { getTrad } from '../../../utils';

import { Settings } from './components/Settings';
import { onChange, setLoaded } from './state/actions';
import { init, initialState } from './state/init';
import { reducer } from './state/reducer';

import type { InitialState } from './state/init';
import type { Action } from './state/reducer';
import type { Configuration } from '../../../../../shared/contracts/configuration';

interface ConfigureTheViewProps {
  config: Configuration;
}

export const ConfigureTheView = ({ config }: ConfigureTheViewProps) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { mutateConfig } = useConfig();
  const { isLoading: isSubmittingForm } = mutateConfig;

  const [showWarningSubmit, setWarningSubmit] = React.useState(false);
  const toggleWarningSubmit = () => setWarningSubmit((prevState) => !prevState);

  const [reducerState, dispatch] = React.useReducer(
    reducer,
    initialState,
    (): InitialState => init(config)
  );
  const typedDispatch: React.Dispatch<Action> = dispatch;
  const { initialData, modifiedData } = reducerState;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toggleWarningSubmit();
  };

  const handleConfirm = async () => {
    trackUsage('willEditMediaLibraryConfig');
    await mutateConfig.mutateAsync(modifiedData as Configuration);
    setWarningSubmit(false);
    typedDispatch(setLoaded());
    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: 'notification.form.success.fields',
        defaultMessage: 'Changes saved',
      }),
    });
  };

  const handleChange = ({
    target: { name, value },
  }: {
    target: { name: keyof Configuration; value: string | number };
  }) => {
    typedDispatch(onChange({ name, value }));
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
                to={`/plugins/${pluginId}`}
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
          x
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
