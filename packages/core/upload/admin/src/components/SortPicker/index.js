import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Carret } from '@strapi/helper-plugin';
import { Picker } from '@buffetjs/core';
import { getTrad } from '../../utils';
import { useSelectTimestamps } from '../../hooks';

import SortList from '../SortList';

const SortPicker = ({ onChange, value }) => {
  const [createdAt, updatedAt] = useSelectTimestamps();
  const orders = {
    created_at_desc: `${createdAt}:DESC`,
    created_at_asc: `${createdAt}:ASC`,
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
    updated_at_desc: `${updatedAt}:DESC`,
    updated_at_asc: `${updatedAt}:ASC`,
  };

  return (
    <Picker
      renderButtonContent={isOpen => (
        <>
          <FormattedMessage id={getTrad('sort.label')} />
          <Carret isUp={isOpen} fill={isOpen ? '#007EFF' : '#292b2c'} />
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
