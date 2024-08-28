import React, { useState } from 'react';

import { useTracking } from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Modal, Textarea } from '@strapi/design-system';
import { Form, Formik } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../../utils/getTrad';
import { urlsToAssets } from '../../../utils/urlsToAssets';
import { urlSchema } from '../../../utils/urlYupSchema';

export const FromUrlForm = ({ onClose, onAddAsset, trackedLocation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const handleSubmit = async ({ urls }) => {
    setLoading(true);
    const urlArray = urls.split(/\r?\n/);
    try {
      const assets = await urlsToAssets(urlArray);

      if (trackedLocation) {
        trackUsage('didSelectFile', { source: 'url', location: trackedLocation });
      }

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
            <Field.Root
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
            >
              <Field.Label>
                {formatMessage({ id: getTrad('input.url.label'), defaultMessage: 'URL' })}
              </Field.Label>
              <Textarea name="urls" onChange={handleChange} value={values.urls} />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Box>

          <Modal.Footer>
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'cancel' })}
            </Button>
            <Button type="submit" loading={loading}>
              {formatMessage({
                id: getTrad('button.next'),
                defaultMessage: 'Next',
              })}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Formik>
  );
};

FromUrlForm.defaultProps = {
  trackedLocation: undefined,
};

FromUrlForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onAddAsset: PropTypes.func.isRequired,
  trackedLocation: PropTypes.string,
};
