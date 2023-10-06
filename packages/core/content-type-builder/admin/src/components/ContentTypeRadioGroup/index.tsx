import React from 'react';

import { useNotification } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';

import { getTrad } from '../../utils';
import CustomRadioGroup from '../CustomRadioGroup';

export const ContentTypeRadioGroup = ({ onChange, ...rest }) => {
  const toggleNotification = useNotification();

  const handleChange = (e) => {
    toggleNotification({
      type: 'info',
      message: {
        id: getTrad('contentType.kind.change.warning'),
        defaultMessage:
          'You just changed the kind of a content type: API will be reset (routes, controllers, and services will be overwritten).',
      },
    });

    onChange(e);
  };

  return <CustomRadioGroup {...rest} onChange={handleChange} />;
};
