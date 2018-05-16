/**
 *
 * AddFilterCTA
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

// Design
import Button from 'components/CustomButton';
import Logo from '../../assets/images/icon_filter.png';

function AddFilterCTA({ onClick }) {
  return (
    <Button type="button" onClick={onClick} marginTop>
      <img src={Logo} alt="filter_logo" />
      <FormattedMessage id="content-manager.components.AddFilterCTA.add" />
    </Button>
  );
}

AddFilterCTA.defaultProps = {
  onClick: () => {},
};

AddFilterCTA.propTypes = {
  onClick: PropTypes.func,
};

export default AddFilterCTA;
