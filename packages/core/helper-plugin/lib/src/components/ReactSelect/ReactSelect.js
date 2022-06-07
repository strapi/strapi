import PropTypes from 'prop-types';
import React from 'react';
import Select from 'react-select';
import { useTheme } from 'styled-components';

import ClearIndicator from './components/ClearIndicator';
import DropdownIndicator from './components/DropdownIndicator';
import IndicatorSeparator from './components/IndicatorSeparator';

import getSelectStyles from './utils/getSelectStyles';

const ReactSelect = ({ components, styles, ...props }) => {
  const theme = useTheme();
  const customStyles = getSelectStyles(theme, props);

  return (
    <Select
      {...props}
      components={{ ClearIndicator, DropdownIndicator, IndicatorSeparator, ...components }}
      styles={{ ...customStyles, ...styles }}
    />
  );
};

export default ReactSelect;

ReactSelect.defaultProps = {
  components: undefined,
  styles: undefined,
};

ReactSelect.propTypes = {
  components: PropTypes.object,
  styles: PropTypes.object,
};
