/**
 *
 * PluginHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import PluginHeaderTitle from 'components/PluginHeaderTitle';
import PluginHeaderActions from 'components/PluginHeaderActions';

import styles from './styles.scss';

function PluginHeader({ actions, description, overrideRendering, subActions, title }) {
  return (
    <div className={cn(styles.pluginHeader, 'row')}>
      <div className="col-lg-7">
        <PluginHeaderTitle
          title={title}
          description={description}
        />
      </div>
      <div className="col-lg-2 justify-content-end">
        <PluginHeaderActions
          actions={subActions}
        />
      </div>
      <div className="col-lg-3 justify-content">
        <PluginHeaderActions
          actions={actions}
          overrideRendering={overrideRendering}
        />
      </div>
    </div>
  );
}

PluginHeader.defaultProps = {
  actions: [],
  description: '',
  overrideRendering: false,
  subActions: [],
  title: '',
};

PluginHeader.propTypes = {
  actions: PropTypes.array,
  description: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
  overrideRendering: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.bool,
  ]),
  subActions: PropTypes.array,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
};

export default PluginHeader;
