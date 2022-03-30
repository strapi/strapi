import React, { useState, useEffect } from 'react';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import LogoInput from '../LogoInput';
import { useConfigurations } from '../../../../../../hooks';
import LogoAPI from '../../temp/LogoAPI';

const API = new LogoAPI();

const Form = () => {
  const {
    logos: { menu },
  } = useConfigurations();
  const [customMenuLogo, setCustomMenuLogo] = useState(null);

  // Temp class to mimic crud API
  // to remove once back routes are ready
  useEffect(() => {
    const storedLogo = API.getLogo();

    if (storedLogo) {
      setCustomMenuLogo(storedLogo);
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
      <Grid gap={4}>
        <GridItem col={6} s={12}>
          <LogoInput customLogo={customMenuLogo} defaultLogo={menu.default} />
        </GridItem>
      </Grid>
    </Box>
  );
};

export default Form;
