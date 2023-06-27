import React from 'react';

import PropTypes from 'prop-types';

import UnauthenticatedLayout from '../../../../layouts/UnauthenticatedLayout';

import BaseLogin from './BaseLogin';

const Login = (loginProps) => {
  return (
    <UnauthenticatedLayout>
      <BaseLogin {...loginProps} />
    </UnauthenticatedLayout>
  );
};

Login.defaultProps = {
  onSubmit: (e) => e.preventDefault(),
};

Login.propTypes = {
  onSubmit: PropTypes.func,
};

export default Login;
