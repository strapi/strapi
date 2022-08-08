import PropTypes from 'prop-types';
import React from 'react';
import SelectAsync from 'react-select/async';
import { useTheme } from 'styled-components';

import ClearIndicator from '../components/ClearIndicator';
import DropdownIndicator from '../components/DropdownIndicator';
import IndicatorSeparator from '../components/IndicatorSeparator';

import getSelectStyles from '../utils/getSelectStyles';

const ReactSelectAsync = ({ components, styles, error, ariaErrorMessage, ...props }) => {
  const theme = useTheme();
  const customStyles = getSelectStyles(theme, error);

  return (
    <SelectAsync
      {...props}
      components={{ ClearIndicator, DropdownIndicator, IndicatorSeparator, ...components }}
      aria-errormessage={error && ariaErrorMessage}
      aria-invalid={!!error}
      styles={{ ...customStyles, ...styles }}
    />
  );
};

export default ReactSelectAsync;

ReactSelectAsync.defaultProps = {
  ariaErrorMessage: undefined,
  components: undefined,
  error: undefined,
  styles: undefined,
};

ReactSelectAsync.propTypes = {
  ariaErrorMessage: PropTypes.string,
  components: PropTypes.object,
  error: PropTypes.string,
  styles: PropTypes.object,
};
