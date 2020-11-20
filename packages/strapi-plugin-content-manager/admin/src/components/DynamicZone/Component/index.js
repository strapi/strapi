import React, { memo, useMemo } from 'react';
import { Arrow } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import isEqual from 'react-fast-compare';
import { useContentTypeLayout } from '../../../hooks';
import FieldComponent from '../../FieldComponent';
import RoundCTA from './RoundCTA';

const Component = ({
  componentUid,
  index,
  isFieldAllowed,
  moveComponentDown,
  moveComponentUp,
  name,
  removeComponentFromDynamicZone,
  showDownIcon,
  showUpIcon,
}) => {
  const { getComponentLayout } = useContentTypeLayout();
  const { icon, friendlyName } = useMemo(() => {
    const {
      info: { icon, name },
    } = getComponentLayout(componentUid);

    return { friendlyName: name, icon };
  }, [componentUid, getComponentLayout]);

  const handleMoveComponentDown = () => moveComponentDown(name, index);

  const handleMoveComponentUp = () => moveComponentUp(name, index);

  const handleRemove = () => removeComponentFromDynamicZone(name, index);

  return (
    <div>
      <div className="arrow-icons">
        {showDownIcon && (
          <RoundCTA className="arrow-btn arrow-down" onClick={handleMoveComponentDown}>
            <Arrow />
          </RoundCTA>
        )}
        {showUpIcon && (
          <RoundCTA className="arrow-btn arrow-up" onClick={handleMoveComponentUp}>
            <Arrow />
          </RoundCTA>
        )}
      </div>
      {isFieldAllowed && (
        <RoundCTA onClick={handleRemove}>
          <FontAwesomeIcon icon="trash-alt" />
        </RoundCTA>
      )}
      <FieldComponent
        componentUid={componentUid}
        componentFriendlyName={friendlyName}
        icon={icon}
        label=""
        name={`${name}.${index}`}
        isFromDynamicZone
      />
    </div>
  );
};

Component.propTypes = {
  componentUid: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  isFieldAllowed: PropTypes.bool.isRequired,
  moveComponentDown: PropTypes.func.isRequired,
  moveComponentUp: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  removeComponentFromDynamicZone: PropTypes.func.isRequired,
  showDownIcon: PropTypes.bool.isRequired,
  showUpIcon: PropTypes.bool.isRequired,
};

export default memo(Component, isEqual);
