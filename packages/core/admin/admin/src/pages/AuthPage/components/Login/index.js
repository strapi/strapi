import React from 'react';

import PropTypes from 'prop-types';

import UnauthenticatedLayout from '../../../../layouts/UnauthenticatedLayout';

import BaseLogin from './BaseLogin';

export const LoginCE = (loginProps) => {
  return (
    <UnauthenticatedLayout>
      <BaseLogin {...loginProps} />
    </UnauthenticatedLayout>
  );
};

LoginCE.defaultProps = {
  onSubmit: (e) => e.preventDefault(),
};

LoginCE.propTypes = {
  onSubmit: PropTypes.func,
};
