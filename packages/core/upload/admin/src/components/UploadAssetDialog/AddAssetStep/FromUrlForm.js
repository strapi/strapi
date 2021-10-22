import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { ModalFooter } from '@strapi/parts/ModalLayout';
import { Textarea } from '@strapi/parts/Textarea';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/parts/Button';
import { Form } from '@strapi/helper-plugin';
import { Formik } from 'formik';
import { getTrad, urlSchema } from '../../../utils';
import { urlsToAssets } from '../../../utils/urlsToAssets';

export const FromUrlForm = ({ onClose, onAddAsset }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);
  const { formatMessage } = useIntl();

  const handleSubmit = async ({ urls }) => {
    setLoading(true);
    const urlArray = urls.split(/\r?\n/);
    try {
      const assets = await urlsToAssets(urlArray);

      // no need to set the loading to false since the component unmounts
      onAddAsset(assets);
    } catch (e) {
      setError(e);
      setLoading(false);
    }
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
                error?.message ||
                (errors.urls
                  ? formatMessage({ id: errors.urls, defaultMessage: 'An error occured' })
                  : undefined)
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
              <Button type="submit" loading={loading}>
                {formatMessage({
                  id: getTrad('button.next'),
                  defaultMessage: 'Next',
                })}
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
