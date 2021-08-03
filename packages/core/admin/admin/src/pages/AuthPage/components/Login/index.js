import React from 'react';
import PropTypes from 'prop-types';
import BaseLogin from './BaseLogin';
import UnauthenticatedLayout from '../../../../layouts/UnauthenticatedLayout';

const Login = loginProps => {
  return (
    <UnauthenticatedLayout>
      <BaseLogin {...loginProps} />
    </UnauthenticatedLayout>
  );
};

Login.defaultProps = {
  onSubmit: e => e.preventDefault(),
  requestError: null,
};

Login.propTypes = {
  formErrors: PropTypes.object.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  requestError: PropTypes.object,
};

export default Login;
