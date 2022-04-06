import React, { useReducer, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import LogoInput from '../LogoInput';
import { useConfigurations } from '../../../../../../hooks';
import LogoAPI from '../../temp/LogoAPI';
import reducer, { initialState } from './reducer';

const API = new LogoAPI();

const Form = () => {
  const { formatMessage } = useIntl();
  const {
    logos: { menu },
  } = useConfigurations();
  const [{ customMenuLogo }, dispatch] = useReducer(reducer, initialState);

  const onChangeMenuLogo = asset => {
    dispatch({
      type: 'SET_CUSTOM_MENU_LOGO',
      value: asset,
    });
  };

  // Temp class to mimic crud API
  // to remove once back end routes are ready
  useEffect(() => {
    const storedLogo = API.getLogo();

    if (storedLogo) {
      onChangeMenuLogo(storedLogo);
    }
  }, []);

  return (
    <Box
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      paddingTop={7}
      paddingBottom={7}
      paddingRight={6}
      paddingLeft={6}
    >
      <Typography variant="delta" as="h3">
        {formatMessage({
          id: 'Settings.application.customization',
          defaultMessage: 'Customization',
        })}
      </Typography>
      <Grid paddingTop={5}>
        <GridItem col={6} s={12}>
          <LogoInput
            onChangeLogo={onChangeMenuLogo}
            customLogo={customMenuLogo}
            defaultLogo={menu.default}
          />
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Form;
