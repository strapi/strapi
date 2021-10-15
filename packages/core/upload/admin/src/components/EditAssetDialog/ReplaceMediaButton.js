import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/parts/Button';
import { VisuallyHidden } from '@strapi/parts/VisuallyHidden';
import { getTrad } from '../../utils';

export const ReplaceMediaButton = ({ onSelectMedia, acceptedMime }) => {
  const { formatMessage } = useIntl();
  const inputRef = useRef(null);

  const handleClick = e => {
    e.preventDefault();
    inputRef.current.click();
  };

  const handleChange = () => {
    const file = inputRef.current.files[0];

    onSelectMedia(file);
  };

  return (
    <>
      <Button variant="secondary" onClick={handleClick}>
        {formatMessage({
          id: getTrad('control-card.replace-media'),
          defaultMessage: 'Replace media',
        })}
      </Button>
      <VisuallyHidden>
        <input
          accept={acceptedMime}
          type="file"
          name="file"
          tabIndex={-1}
          ref={inputRef}
          onChange={handleChange}
          aria-hidden
        />
      </VisuallyHidden>
    </>
  );
};

ReplaceMediaButton.propTypes = {
  acceptedMime: PropTypes.string.isRequired,
  onSelectMedia: PropTypes.func.isRequired,
};
