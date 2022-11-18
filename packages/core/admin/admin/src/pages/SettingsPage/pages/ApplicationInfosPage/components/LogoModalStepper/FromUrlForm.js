import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { ModalFooter } from '@strapi/design-system/ModalLayout';
import urlToFile from '../../utils/urlToFile';
import { parseFileMetadatas } from '../../utils/parseFileMetadatas';
import { SIZE, DIMENSION } from '../../utils/constants';

const FromUrlForm = ({ goTo, next, onClose, setLocalImage }) => {
  const { formatMessage } = useIntl();
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setLogoUrl(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      const file = await urlToFile(logoUrl);
      const asset = await parseFileMetadatas(file);

      setLocalImage(asset);
      goTo(next);
    } catch (err) {
      if (err.displayMessage) {
        setError(formatMessage(err.displayMessage, { size: SIZE, dimension: DIMENSION }));
      } else {
        throw err;
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <Box paddingLeft={8} paddingRight={8} paddingTop={6} paddingBottom={6}>
        <TextInput
          label={formatMessage({
            id: 'Settings.application.customization.modal.upload.from-url.input-label',
            defaultMessage: 'URL',
          })}
          error={error}
          onChange={handleChange}
          value={logoUrl}
          name="logo-url"
        />
      </Box>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <Button type="submit">
            {formatMessage({
              id: 'Settings.application.customization.modal.upload.next',
              defaultMessage: 'Next',
            })}
          </Button>
        }
      />
    </form>
  );
};

FromUrlForm.defaultProps = {
  next: null,
};

FromUrlForm.propTypes = {
  goTo: PropTypes.func.isRequired,
  next: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  setLocalImage: PropTypes.func.isRequired,
};

export default FromUrlForm;
