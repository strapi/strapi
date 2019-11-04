import React, { memo, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { Remove } from '@buffetjs/icons'; // TODO use css instead
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
  const { allLayoutData, layout } = useDataManager();
  const dynamicZoneAvailableComponents = get(
    layout,
    ['schema', 'attributes', name, 'components'],
    []
  );
  const handleMouseEvent = () => setIsOver(prev => !prev);
  const displayInfo = isOver && !isOpen;
  console.log({ allLayoutData, dynamicZoneAvailableComponents });

  return (
    <>
      <Wrapper show={displayInfo}>
        <Button
          isOpen={isOpen}
          type="button"
          onMouseEnter={handleMouseEvent}
          onMouseLeave={handleMouseEvent}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <Remove />
        </Button>

        <div className="info">
          <FormattedMessage
            id={`${pluginId}.components.DynamicZone.add-compo`}
            values={{ componentName: name }}
          />
        </div>
        <ComponentsPicker isOpen={isOpen}>
          {dynamicZoneAvailableComponents.map(name => {
            return <DynamicComponentCard key={name} componentUid={name} />;
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
export default memo(DynamicZone);
