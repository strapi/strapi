import React, { memo } from 'react';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import Tr from './Tr';

function ListRow({ name, push, type }) {
  const getUrl = to =>
    `/plugins/${pluginId}/ctm-configurations/${type}/${name}${to}`;
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
  type: 'models',
};

ListRow.propTypes = {
  name: PropTypes.string,
  push: PropTypes.func,
  type: PropTypes.string,
  // uid: PropTypes.string,
};

export default memo(ListRow);
