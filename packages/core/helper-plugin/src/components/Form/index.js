import React, { useEffect, useRef } from 'react';
import { Form, useFormikContext } from 'formik';

const FormWithFocus = (props) => {
  const formRef = useRef(null);
  const { isSubmitting, isValidating, errors, touched } = useFormikContext();

  useEffect(() => {
    if (isSubmitting && !isValidating) {
      const errorsInForm = formRef.current.querySelectorAll('[data-strapi-field-error]');

      if (errorsInForm.length > 0) {
        const firstError = errorsInForm[0];
        const describingId = firstError.getAttribute('id');
        const formElementInError = formRef.current.querySelector(
          `[aria-describedby="${describingId}"]`
        );

        if (formElementInError) {
          formElementInError.focus();
        }
      }
    }

    if (!isSubmitting && !isValidating && Object.keys(errors).length) {
      const el = document.getElementById('global-form-error');

      if (el) {
        el.focus();
      }
    }
  }, [errors, isSubmitting, isValidating, touched]);

  return <Form ref={formRef} {...props} noValidate />;
};

export default FormWithFocus;
