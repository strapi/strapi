import React, {
  // useCallback,
  useState,
} from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import DynamicComponentCard from '../DynamicComponentCard';
import Button from './Button';
import ComponentsPicker from './ComponentsPicker';
import Wrapper from './Wrapper';

const DynamicZone = ({ name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const {
    addComponentToDynamicZone,
    // allLayoutData,
    layout,
    // modifiedData,
  } = useDataManager();
  // const getDynamicDisplayedComponents = useCallback(() => {
  //   return get(modifiedData, [name], []).map(data => data.__component);
  // }, [modifiedData, name]);

  const dynamicZoneAvailableComponents = get(
    layout,
    ['schema', 'attributes', name, 'components'],
    []
  );
  const displayInfo = isOver && !isOpen;
  const handleMouseEvent = () => setIsOver(prev => !prev);

  return (
    <>
      <Wrapper show={displayInfo}>
        <Button
          isOpen={isOpen}
          type="button"
          onMouseEnter={handleMouseEvent}
          onMouseLeave={handleMouseEvent}
          onClick={() => setIsOpen(prev => !prev)}
        />

        <div className="info">
          <FormattedMessage
            id={`${pluginId}.components.DynamicZone.add-compo`}
            values={{ componentName: name }}
          />
        </div>
        <ComponentsPicker isOpen={isOpen}>
          {dynamicZoneAvailableComponents.map(componentUid => {
            return (
              <DynamicComponentCard
                key={componentUid}
                componentUid={componentUid}
                onClick={() => {
                  setIsOpen(false);
                  addComponentToDynamicZone(name, componentUid);
                }}
              />
            );
          })}
        </ComponentsPicker>
      </Wrapper>
    </>
  );
};

DynamicZone.propTypes = {
  name: PropTypes.string.isRequired,
};

export { DynamicZone };
export default DynamicZone;
