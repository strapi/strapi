import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import Tooltip from './Tooltip';

const DynamicComponent = ({
  componentUid,
  history: { push },
  setIsOverDynamicZone,
}) => {
  const [state, setState] = useState(false);
  const handleMouseEvent = () => {
    setIsOverDynamicZone(v => !v);
    setState(v => !v);
  };

  return (
    <div
      className="dynamic-component"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        push(
          `/plugins/${pluginId}/ctm-configurations/edit-settings/components/${componentUid}`
        );
      }}
      onMouseEnter={handleMouseEvent}
      onMouseLeave={handleMouseEvent}
    >
      <div className="component-icon">
        <i className="fa fa-picture-o" />
      </div>

      <div className="component-uid">
        {state ? (
          <FormattedMessage id={`${pluginId}.components.DraggableAttr.edit`} />
        ) : (
          <span>{componentUid}</span>
        )}
      </div>
      <Tooltip isOver={state}>{componentUid}</Tooltip>
    </div>
  );
};

DynamicComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  history: PropTypes.shape({
    push: PropTypes.func.isRequired,
  }),
  setIsOverDynamicZone: PropTypes.func.isRequired,
};

export default withRouter(DynamicComponent);
