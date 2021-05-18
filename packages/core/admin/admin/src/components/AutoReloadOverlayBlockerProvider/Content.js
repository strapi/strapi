import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

const Content = ({ description, title }) => {
  return (
    <>
      <h4>
        <FormattedMessage {...title} />
      </h4>
      <p>
        <FormattedMessage {...description} />
      </p>
    </>
  );
};

Content.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

export default Content;
