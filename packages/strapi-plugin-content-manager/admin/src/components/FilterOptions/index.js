/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Button from 'components/CustomButton';
import InputSelect from 'components/InputSelect';
import InputText from 'components/InputText';

import Div from './Div';

function FilterOptions({ onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      <Div>
        <InputSelect
          onChange={() => {}}
          name=""
          value=""
          selectOptions={[]}
          style={{ minHeight: '30px', minWidth: '170px', maxWidth: '200px' }}
        />

        <InputSelect
          onChange={() => {}}
          name=""
          value=""
          selectOptions={[]}
          style={{ minHeight: '30px', minWidth: '130px', maxWidth: '160px', marginLeft: '10px', marginRight: '10px' }}
        />

        <InputText
          onChange={() => {}}
          name=""
          value=""
          selectOptions={[]}
          style={{ height: '30px', width: '200px', marginRight: '10px' }}
        />

        <Button type="submit" style={{ marginTop: '.9rem' }}>
          <FormattedMessage id="content-manager.components.FilterOptions.button.apply" />
        </Button>
      </Div>
    </form>
  );
}

FilterOptions.defaultProps = {
  onSubmit: (e) => {
    e.preventDefault();
  },
};

FilterOptions.propTypes = {
  onSubmit: PropTypes.func,
};

export default FilterOptions;
