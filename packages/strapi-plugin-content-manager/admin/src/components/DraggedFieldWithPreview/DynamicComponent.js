import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import DynamicComponentCard from '../DynamicComponentCard';
import Tooltip from './Tooltip';

const DynamicComponent = ({ componentUid, setIsOverDynamicZone }) => {
  const [state, setState] = useState(false);
  const { push } = useHistory();

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
          `/plugins/${pluginId}/ctm-configurations/edit-settings/components/${componentUid}/`
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
  setIsOverDynamicZone: PropTypes.func.isRequired,
};

export default DynamicComponent;
