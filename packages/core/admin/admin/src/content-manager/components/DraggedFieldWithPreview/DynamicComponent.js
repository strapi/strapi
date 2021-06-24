import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PropTypes from 'prop-types';
import { hasPermissions, useRBACProvider } from '@strapi/helper-plugin';
import pluginPermissions from '../../permissions';
import DynamicComponentCard from '../DynamicComponentCard';
import Tooltip from './Tooltip';

const DynamicComponent = ({ componentUid, friendlyName, icon, setIsOverDynamicZone }) => {
  const [isOver, setIsOver] = useState(false);
  const [{ isLoading, canAccess }, setState] = useState({ isLoading: true, canAccess: false });
  const { push } = useHistory();
  const { allPermissions } = useRBACProvider();

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const canAccess = await hasPermissions(
          allPermissions,
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
          // FIXME when changing the routing
          push(`/plugins/content-manager/components/${componentUid}/configurations/edit`);
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
