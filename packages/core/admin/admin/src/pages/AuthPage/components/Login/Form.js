import React, { useEffect } from 'react';
import { Form, useFormikContext, getIn } from 'formik';

const FormWithFocus = props => {
  const { isSubmitting, isValidating, errors, touched } = useFormikContext();

  useEffect(() => {
    if (isSubmitting && !isValidating) {
      const errorNames = Object.keys(touched).reduce((prev, key) => {
        if (getIn(errors, key)) {
          prev.push(key);
        }

        return prev;
      }, []);

      if (errorNames.length) {
        let errorEl;

        errorNames.forEach(errorKey => {
          const selector = `[name="${errorKey}"]`;

          if (!errorEl) {
            errorEl = document.querySelector(selector);
          }
        });

        errorEl.focus();
      }
    }
  }, [errors, isSubmitting, isValidating, touched]);

  return <Form {...props} noValidate />;
};

export default FormWithFocus;
