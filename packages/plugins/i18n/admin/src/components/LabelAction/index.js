import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Tooltip } from '@strapi/parts/Tooltip';

const LabelAction = ({ title, icon }) => {
  const { formatMessage } = useIntl();

  return (
    <Tooltip description={formatMessage(title)}>
      <button
        aria-label={formatMessage(title)}
        style={{
          border: 'none',
          padding: 0,
          background: 'transparent',
        }}
        type="button"
      >
        {icon}
      </button>
    </Tooltip>
  );
};

LabelAction.propTypes = {
  icon: PropTypes.element.isRequired,
  title: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

export default LabelAction;
