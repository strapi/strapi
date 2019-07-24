import React, { memo } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import Tr from './Tr';

function ListRow({ name, push, type, uid, source }) {
  const getUrl = to =>
    `/plugins/${pluginId}/ctm-configurations/${type}/${uid}${to}${
      source ? `?source=${source}` : ''
    }`;
  const to = type === 'models' ? '/list-settings' : '';

  return (
    <Tr onClick={() => push(getUrl(to))}>
      <td>
        <p>{name}</p>
      </td>
    </Tr>
  );
}

ListRow.defaultProps = {
  name: '',
  push: () => {},
  source: null,
  type: 'models',
};

ListRow.propTypes = {
  name: PropTypes.string,
  push: PropTypes.func,
  source: PropTypes.string,
  type: PropTypes.string,
  uid: PropTypes.string,
};

export default memo(ListRow);
