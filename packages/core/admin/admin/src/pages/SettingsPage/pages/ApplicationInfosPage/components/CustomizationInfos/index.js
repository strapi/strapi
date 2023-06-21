import React, { forwardRef, useImperativeHandle, useReducer } from 'react';

import { Box, Grid, GridItem, Typography } from '@strapi/design-system';
import { useTracking } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useConfigurations } from '../../../../../../hooks';
import { DIMENSION, SIZE } from '../../utils/constants';
import LogoInput from '../LogoInput';

import init from './init';
import reducer, { initialState } from './reducer';

const CustomizationInfos = forwardRef(({ canUpdate, projectSettingsStored }, ref) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const {
    logos: { menu, auth },
  } = useConfigurations();
  const [{ menuLogo, authLogo }, dispatch] = useReducer(reducer, initialState, () =>
    init(initialState, projectSettingsStored)
  );

  const handleChangeMenuLogo = (asset) => {
    dispatch({
      type: 'SET_CUSTOM_MENU_LOGO',
      value: asset,
    });
  };

  const handleResetMenuLogo = () => {
    trackUsage('didClickResetLogo', {
      logo: 'menu',
    });

    dispatch({
      type: 'RESET_CUSTOM_MENU_LOGO',
    });
  };

  const handleChangeAuthLogo = (asset) => {
    dispatch({
      type: 'SET_CUSTOM_AUTH_LOGO',
      value: asset,
    });
  };

  const handleResetAuthLogo = () => {
    trackUsage('didClickResetLogo', {
      logo: 'auth',
    });

    dispatch({
      type: 'RESET_CUSTOM_AUTH_LOGO',
    });
  };

  useImperativeHandle(ref, () => ({
    getValues: () => ({ menuLogo: menuLogo.submit, authLogo: authLogo.submit }),
  }));

  return (
    <Box
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingRight={7}
      paddingLeft={7}
    >
      <Typography variant="delta" as="h3">
        {formatMessage({
          id: 'Settings.application.customization',
          defaultMessage: 'Customization',
        })}
      </Typography>
      <Typography variant="pi" textColor="neutral600">
        {formatMessage(
          {
            id: 'Settings.application.customization.size-details',
            defaultMessage: 'Max dimension: {dimension}×{dimension}, Max file size: {size}KB',
          },
          { dimension: DIMENSION, size: SIZE }
        )}
      </Typography>
      <Grid paddingTop={4} gap={4}>
        <GridItem col={6} s={12}>
          <LogoInput
            canUpdate={canUpdate}
            customLogo={menuLogo.display}
            defaultLogo={menu.default}
            hint={formatMessage({
              id: 'Settings.application.customization.menu-logo.carousel-hint',
              defaultMessage: 'Replace the logo in the main navigation',
            })}
            label={formatMessage({
              id: 'Settings.application.customization.carousel.menu-logo.title',
              defaultMessage: 'Menu logo',
            })}
            onChangeLogo={handleChangeMenuLogo}
            onResetLogo={handleResetMenuLogo}
          />
        </GridItem>
        <GridItem col={6} s={12}>
          <LogoInput
            canUpdate={canUpdate}
            customLogo={authLogo.display}
            defaultLogo={auth.default}
            hint={formatMessage({
              id: 'Settings.application.customization.auth-logo.carousel-hint',
              defaultMessage: 'Replace the logo in the authentication pages',
            })}
            label={formatMessage({
              id: 'Settings.application.customization.carousel.auth-logo.title',
              defaultMessage: 'Auth logo',
            })}
            onChangeLogo={handleChangeAuthLogo}
            onResetLogo={handleResetAuthLogo}
          />
        </GridItem>
      </Grid>
    </Box>
  );
});

CustomizationInfos.defaultProps = {
  canUpdate: false,
  projectSettingsStored: null,
};

CustomizationInfos.propTypes = {
  canUpdate: PropTypes.bool,
  projectSettingsStored: PropTypes.shape({
    menuLogo: PropTypes.shape({
      url: PropTypes.string,
      name: PropTypes.string,
    }),
  }),
};

export default CustomizationInfos;
