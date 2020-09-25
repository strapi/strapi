import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import { hasPermissions, useUser } from 'strapi-helper-plugin';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import DynamicComponentCard from '../DynamicComponentCard';
import Tooltip from './Tooltip';

const DynamicComponent = ({ componentUid, friendlyName, icon, setIsOverDynamicZone }) => {
  const [isOver, setIsOver] = useState(false);
  const [{ isLoading, canAccess }, setState] = useState({ isLoading: true, canAccess: false });
  const { push } = useHistory();
  const userPermissions = useUser();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const canAccess = await hasPermissions(
          userPermissions,
          pluginPermissions.componentsConfigurations
        );

        setState({ isLoading: false, canAccess });
      } catch (err) {
        setState({ isLoading: false });
      }
    };

    checkPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseEvent = () => {
    setIsOverDynamicZone(v => !v);
    setIsOver(v => !v);
  };

  return (
    <DynamicComponentCard
      componentUid={componentUid}
      friendlyName={friendlyName}
      icon={icon}
      isOver={isOver}
      onClick={() => {
        if (!isLoading && canAccess) {
          push(`/plugins/${pluginId}/ctm-configurations/edit-settings/components/${componentUid}/`);
        }
      }}
      onMouseEvent={handleMouseEvent}
      tradId="components.DraggableAttr.edit"
    >
      <Tooltip isOver={isOver}>{componentUid}</Tooltip>
    </DynamicComponentCard>
  );
};

DynamicComponent.defaultProps = {
  friendlyName: '',
  icon: 'smile',
};

DynamicComponent.propTypes = {
  componentUid: PropTypes.string.isRequired,
  friendlyName: PropTypes.string,
  icon: PropTypes.string,
  setIsOverDynamicZone: PropTypes.func.isRequired,
};

export default DynamicComponent;
