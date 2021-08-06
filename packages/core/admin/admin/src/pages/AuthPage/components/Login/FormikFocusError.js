import { useEffect } from 'react';
import { useFormikContext, getIn } from 'formik';

const FormikFocusError = () => {
  const { isSubmitting, isValidating, errors, touched } = useFormikContext();

  useEffect(() => {
    if (isSubmitting && !isValidating) {
      const errorNames = Object.keys(touched).reduce((prev, key) => {
        if (getIn(errors, key)) {
          prev.push(key);
        }

        return prev;
      }, []);

      if (errorNames.length && typeof document !== 'undefined') {
        let errorEl;

        errorNames.forEach(errorKey => {
          const selector = `[name="${errorKey}"]`;

          if (!errorEl) {
            errorEl = document.querySelector(selector);
          }
        });

        setTimeout(() => {
          if (errorEl) {
            errorEl.focus();
          }
        }, 100);
      }
    }
  }, [errors, isSubmitting, isValidating, touched]);

  return null;
};

export default FormikFocusError;
