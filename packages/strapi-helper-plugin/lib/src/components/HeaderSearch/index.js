import React from 'react';
import PropTypes from 'prop-types';
import SearchIcon from '../../svgs/Search';
import SearchInfo from '../SearchInfo';
import Clear from './Clear';
import ClearIcon from './ClearIcon';
import Wrapper from './Wrapper';

const HeaderSearch = ({ label, onChange, onClear, placeholder, value }) => {
  return (
    <Wrapper>
      <div>
        <SearchIcon />
      </div>
      <div>
        <input
          onChange={onChange}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {value !== '' && (
          <Clear onClick={onClear}>
            <ClearIcon />
          </Clear>
        )}
      </div>
      <SearchInfo label={label} />
    </Wrapper>
  );
};

HeaderSearch.defaultProps = {
  label: '',
  onChange: () => {},
  onClear: () => {},
  placeholder: 'Search for an entry',
  value: '',
};

HeaderSearch.propTypes = {
  label: PropTypes.string,
  onChange: PropTypes.func,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default HeaderSearch;
