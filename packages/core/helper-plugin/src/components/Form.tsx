import * as React from 'react';

import { Form as FormikForm, FormikFormProps, useFormikContext } from 'formik';

export type FormProps = Omit<FormikFormProps, 'noValidate'>;

/**
 * @deprecated Use Formik form directly instead.
 */
const Form = ({ ...props }: FormProps) => {
  const formRef = React.useRef<HTMLFormElement>(null!);
  const { isSubmitting, isValidating, errors, touched } = useFormikContext();

  React.useEffect(() => {
    if (isSubmitting && !isValidating) {
      const errorsInForm = formRef.current.querySelectorAll('[data-strapi-field-error]');

      if (errorsInForm && errorsInForm.length > 0) {
        const firstError = errorsInForm[0];
        const describingId = firstError.getAttribute('id');
        const formElementInError = formRef.current.querySelector(
          `[aria-describedby="${describingId}"]`
        );

        if (formElementInError && formElementInError instanceof HTMLElement) {
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

  return <FormikForm ref={formRef} {...props} noValidate />;
};

export { Form };
