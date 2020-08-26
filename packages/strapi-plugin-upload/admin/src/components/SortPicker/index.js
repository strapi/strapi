import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Carret } from '@buffetjs/icons';
import { getTrad, getFileModelTimestamps } from '../../utils';

import SortList from '../SortList';
import Picker from '../Picker';

const SortPicker = ({ onChange, value }) => {
  const { plugins } = useGlobalContext();
  const [created_at, updated_at] = getFileModelTimestamps(plugins);
  const orders = {
    created_at_desc: `${created_at}:DESC`,
    created_at_asc: `${created_at}:ASC`,
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
    updated_at_desc: `${updated_at}:DESC`,
    updated_at_asc: `${updated_at}:ASC`,
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
