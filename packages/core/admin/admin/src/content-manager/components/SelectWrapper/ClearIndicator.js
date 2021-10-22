import React from 'react';
import { components } from 'react-select';
import CloseAlertIcon from '@strapi/icons/CloseAlertIcon';
import IconBox from './IconBox';

const ClearIndicator = props => {
  const Component = components.ClearIndicator;

  return (
    <Component {...props}>
      <IconBox as="button" type="button">
        <CloseAlertIcon />
      </IconBox>
    </Component>
  );
};

export default ClearIndicator;
