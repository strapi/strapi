import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import { Carret } from '@buffetjs/icons';
import getTrad from '../../utils/getTrad';

import SortList from '../SortList';
import Picker from '../Picker';

const SortPicker = ({ onChange, value }) => {
  const orders = {
    created_at_asc: 'created_at:ASC',
    created_at_desc: 'created_at:DESC',
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
    updated_at_asc: 'updated_at:ASC',
    updated_at_desc: 'updated_at:DESC',
  };

  return (
    <Picker
      renderButtonContent={isOpen => (
        <>
          <FormattedMessage id={getTrad('sort.label')} />
          <Carret fill={isOpen ? '#007EFF' : '#292b2c'} />
        </>
      )}
      renderSectionContent={onToggle => (
        <SortList
          list={orders}
          selectedItem={value}
          onClick={e => {
            onChange(e);
            onToggle();
          }}
        />
      )}
    />
  );
};

SortPicker.defaultProps = {
  onChange: () => {},
  value: null,
};

SortPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
};

export default SortPicker;
