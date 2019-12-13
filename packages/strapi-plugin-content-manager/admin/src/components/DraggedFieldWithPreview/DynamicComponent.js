import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';
import DynamicComponentCard from '../DynamicComponentCard';
import Tooltip from './Tooltip';

const DynamicComponent = ({
  componentUid,
  friendlyName,
  setIsOverDynamicZone,
}) => {
  const [state, setState] = useState(false);
  const { push } = useHistory();

  const handleMouseEvent = () => {
    setIsOverDynamicZone(v => !v);
    setState(v => !v);
  };

  return (
    <DynamicComponentCard
      componentUid={componentUid}
      friendlyName={friendlyName}
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

DynamicComponent.defaultProps = {
  friendlyName: '',
};

DynamicComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  friendlyName: PropTypes.string,
  setIsOverDynamicZone: PropTypes.func.isRequired,
};

export default DynamicComponent;
