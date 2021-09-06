import React, { useEffect } from 'react';
import { Form, useFormikContext, getIn } from 'formik';

// TODO move the components folder
const FormWithFocus = props => {
  const { isSubmitting, isValidating, errors, touched } = useFormikContext();

  useEffect(() => {
    if (isSubmitting && !isValidating) {
      const errorNames = Object.keys(touched).filter(error => getIn(errors, error));

      if (errorNames.length) {
        let errorEl;

        // Does not handle field arrays
        errorNames.forEach(errorKey => {
          const selector = `[name="${errorKey}"]`;

          if (!errorEl) {
            errorEl = document.querySelector(selector);
          }
        });

        errorEl?.focus();
      }
    }
    if (!isSubmitting && !isValidating && Object.keys(errors).length) {
      const el = document.getElementById('global-form-error');

      el?.focus();
    }
  }, [errors, isSubmitting, isValidating, touched]);

  return <Form {...props} noValidate />;
};

export default FormWithFocus;
