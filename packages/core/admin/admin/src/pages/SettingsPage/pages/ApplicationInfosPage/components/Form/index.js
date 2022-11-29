import React, { useReducer, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useTracking } from '@strapi/helper-plugin';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { useConfigurations } from '../../../../../../hooks';
import LogoInput from '../LogoInput';
import reducer, { initialState } from './reducer';
import init from './init';
import { DIMENSION, SIZE } from '../../utils/constants';

const Form = forwardRef(({ projectSettingsStored }, ref) => {
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
    trackUsage('didClickResetLogo');

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
      <Grid paddingTop={4} gap={4}>
        <GridItem col={6} s={12}>
          <LogoInput
            customLogo={menuLogo.display}
            defaultLogo={menu.default}
            // TODO translation
            hint={formatMessage(
              {
                id: 'app',
                defaultMessage:
                  'Change the admin panel logo (Max dimension: {dimension}x{dimension}, Max file size: {size}KB)',
              },
              { dimension: DIMENSION, size: SIZE }
            )}
            label={formatMessage({ id: 'app', defaultMessage: 'Menu logo' })}
            onChangeLogo={handleChangeMenuLogo}
            onResetMenuLogo={handleResetMenuLogo}
          />
        </GridItem>
        <GridItem col={6} s={12}>
          <LogoInput
            customLogo={authLogo.display}
            defaultLogo={auth.default}
            // TODO translation
            hint={formatMessage(
              {
                id: 'app',
                defaultMessage:
                  'Change the authentication pages logo (Max dimension: {dimension}x{dimension}, Max file size: {size}KB)',
              },
              { dimension: DIMENSION, size: SIZE }
            )}
            label={formatMessage({ id: 'app', defaultMessage: 'Auth logo' })}
            onChangeLogo={handleChangeAuthLogo}
            onResetMenuLogo={handleResetAuthLogo}
          />
        </GridItem>
      </Grid>
    </Box>
  );
});

Form.defaultProps = {
  projectSettingsStored: null,
};

Form.propTypes = {
  projectSettingsStored: PropTypes.shape({
    menuLogo: PropTypes.shape({
      url: PropTypes.string,
      name: PropTypes.string,
    }),
  }),
};

export default Form;
