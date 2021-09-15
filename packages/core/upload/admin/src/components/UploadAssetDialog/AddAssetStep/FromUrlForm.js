import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { ModalFooter } from '@strapi/parts/ModalLayout';
import { Textarea } from '@strapi/parts/Textarea';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/parts/Button';
import { Form } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { getTrad, urlSchema } from '../../../utils';

export const FromUrlForm = ({ onClose, onAddAsset }) => {
  const { formatMessage } = useIntl();

  const handleSubmit = () => {
    onAddAsset();
  };

  return (
    <Formik
      enableReinitialize
      initialValues={{
        urls: '',
      }}
      onSubmit={handleSubmit}
      validationSchema={urlSchema}
      validateOnChange={false}
    >
      {({ values, errors, handleChange }) => (
        <Form noValidate>
          <Box paddingLeft={8} paddingRight={8} paddingBottom={6} paddingTop={6}>
            <Textarea
              label={formatMessage({ id: getTrad('input.url.label'), defaultMessage: 'URL' })}
              name="urls"
              hint={formatMessage({
                id: getTrad('input.url.description'),
                defaultMessage: 'Separate your URL links by a carriage return.',
              })}
              error={
                errors.urls
                  ? formatMessage({ id: errors.urls, defaultMessage: 'An error occured' })
                  : undefined
              }
              onChange={handleChange}
            >
              {values.urls}
            </Textarea>
          </Box>

          <ModalFooter
            startActions={
              <Button onClick={onClose} variant="tertiary">
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
              </Button>
            }
            endActions={
              <Button type="submit">
                {formatMessage(
                  {
                    id: getTrad('modal.upload-list.footer.button.singular'),
                    defaultMessage: 'Upload assets',
                  },
                  { number: 0 }
                )}
              </Button>
            }
          />
        </Form>
      )}
    </Formik>
  );
};

FromUrlForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
};
