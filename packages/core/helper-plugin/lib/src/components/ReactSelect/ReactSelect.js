import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import { useTheme } from 'styled-components';

import ClearIndicator from './components/ClearIndicator';
import DropdownIndicator from './components/DropdownIndicator';
import IndicatorSeparator from './components/IndicatorSeparator';

import getSelectStyles from './utils/getSelectStyles';

const ReactSelect = ({ components, styles, error, ariaErrorMessage, ...props }) => {
  const theme = useTheme();
  const customStyles = getSelectStyles(theme, error);

  return (
    <Select
      menuPosition="fixed"
      components={{
        ClearIndicator,
        DropdownIndicator,
        IndicatorSeparator,
        LoadingIndicator: () => null,
        ...components,
      }}
      aria-errormessage={error && ariaErrorMessage}
      aria-invalid={!!error}
      styles={{ ...customStyles, ...styles }}
      {...props}
    />
  );
};

export default ReactSelect;

ReactSelect.defaultProps = {
  ariaErrorMessage: undefined,
  components: undefined,
  error: undefined,
  styles: undefined,
};

ReactSelect.propTypes = {
  ariaErrorMessage: PropTypes.string,
  components: PropTypes.object,
  error: PropTypes.string,
  styles: PropTypes.object,
};
