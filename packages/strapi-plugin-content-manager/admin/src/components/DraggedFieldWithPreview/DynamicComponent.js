import React, { useState } from 'react';
import { withRouter } from 'react-router-dom';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import DynamicComponentCard from '../DynamicComponentCard';
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
    <DynamicComponentCard
      componentUid={componentUid}
      isOver={state}
      onClick={() => {
        push(
          `/plugins/${pluginId}/ctm-configurations/edit-settings/components/${componentUid}`
        );
      }}
      onMouseEvent={handleMouseEvent}
      tradId="components.DraggableAttr.edit"
    >
      <Tooltip isOver={state}>{componentUid}</Tooltip>
    </DynamicComponentCard>
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
