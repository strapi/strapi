import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import Field from '../Field';
import Wrapper from './Wrapper';

const Fields = ({ displayedHeaders, items, onChange }) => {
  const getInputValue = useCallback(
    headerName => displayedHeaders.findIndex(({ name }) => name === headerName) !== -1,
    [displayedHeaders]
  );

  return (
    <Wrapper>
      {items.map(header => (
        <Field key={header} name={header} onChange={onChange} value={getInputValue(header)} />
      ))}
    </Wrapper>
  );
};

Fields.propTypes = {
  displayedHeaders: PropTypes.array.isRequired,
  items: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default Fields;
