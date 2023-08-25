import * as React from 'react';

import { SkipToContent } from '@strapi/design-system';
import {
  auth,
  prefixFileUrlWithBackendUrl,
  TrackingProvider,
  useFetchClient,
} from '@strapi/helper-plugin';
import merge from 'lodash/merge';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQueries } from 'react-query';
import { useDispatch } from 'react-redux';

import { ADMIN_PERMISSIONS_CE } from '../../constants';
import useConfigurations from '../../hooks/useConfigurations';
import { useEnterprise } from '../../hooks/useEnterprise';

import { SET_ADMIN_PERMISSIONS } from './constants';

export function App({ children }) {
  const { updateProjectSettings } = useConfigurations();
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const { get, post } = useFetchClient();

  const adminPermissions = useEnterprise(
    ADMIN_PERMISSIONS_CE,
    async () => (await import('../../../../ee/admin/constants')).ADMIN_PERMISSIONS_EE,
    {
      combine(cePermissions, eePermissions) {
        // the `settings` NS e.g. are deep nested objects, that need a deep merge
        return merge({}, cePermissions, eePermissions);
      },

      defaultValue: ADMIN_PERMISSIONS_CE,
    }
  );

  // TODO: this should be moved to redux
  const [{ uuid }, setState] = React.useState({
    uuid: undefined,
  });

  // Store permissions in redux
  React.useEffect(() => {
    dispatch({ type: SET_ADMIN_PERMISSIONS, payload: adminPermissions });
  }, [adminPermissions, dispatch]);

  const [
    { data: token, error: errorRenewToken },
    { data: initData },
    { data: telemetryProperties },
  ] = useQueries([
    {
      queryKey: 'renew-token',
      async queryFn() {
        const {
          data: {
            data: { token },
          },
        } = await post('/admin/renew-token', { token: auth.getToken() });

        return token;
      },

      enabled: !!auth.getToken(),
      suspense: true,
    },

    {
      queryKey: 'init',
      async queryFn() {
        const {
          data: { data },
        } = await get(`/admin/init`);

        return data;
      },
      suspense: true,
    },

    {
      queryKey: 'telemetry-properties',
      async queryFn() {
        const {
          data: { data },
        } = await get(`/admin/telemetry-properties`, {
          // NOTE: needed because the interceptors of the fetchClient redirect to /login when receive a
          // 401 and it would end up in an infinite loop when the user doesn't have a session.
          validateStatus: (status) => status < 500,
        });

        return data;
      },

      enabled: !!auth.getToken(),
    },
  ]);

  React.useEffect(() => {
    // If the renew token could not be fetched, logout the user
    if (errorRenewToken) {
      auth.clearAppStorage();
      window.location.reload();
    } else if (token) {
      auth.updateToken(token);
    }
  }, [errorRenewToken, token]);

  // Store the fetched project settings (e.g. logos)
  // TODO: this should be moved to redux
  React.useEffect(() => {
    if (initData) {
      updateProjectSettings({
        menuLogo: prefixFileUrlWithBackendUrl(initData.menuLogo),
        authLogo: prefixFileUrlWithBackendUrl(initData.authLogo),
      });

      // TODO: this should be stored in redux
      setState((prev) => ({
        ...prev,
        hasAdmin: initData.hasAdmin,
        uuid: initData.uuid,
      }));
    }
  }, [initData, updateProjectSettings]);

  // We can't use useTracking here, because `App` is not wrapped in the tracking provider
  // context, which we can't do because the context values contain data that can only be
  // accessed when a user is logged in.
  // This should not use `useFetchClient`, because it does not communicate to the admin API.
  React.useEffect(() => {
    async function trackInitEvent() {
      await fetch('https://analytics.strapi.io/api/v2/track', {
        body: JSON.stringify({
          event: 'didInitializeAdministration',
          // This event is anonymous
          userId: '',
          eventPropeties: {},
          userProperties: {},
          groupProperties: { ...telemetryProperties, projectId: uuid },
        }),

        headers: {
          'Content-Type': 'application/json',
          'X-Strapi-Event': 'didInitializeAdministration',
        },

        method: 'POST',
      });
    }

    if (uuid) {
      trackInitEvent();
    }
  }, [telemetryProperties, uuid]);

  const trackingContext = React.useMemo(
    () => ({
      uuid,
      telemetryProperties,
    }),
    [uuid, telemetryProperties]
  );

  return (
    <TrackingProvider value={trackingContext}>
      <SkipToContent>{formatMessage({ id: 'skipToContent' })}</SkipToContent>
      {children}
    </TrackingProvider>
  );
}

App.propTypes = {
  children: PropTypes.node.isRequired,
};
