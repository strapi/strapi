import React, { useCallback, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import DynamicComponentCard from '../DynamicComponentCard';
import FieldComponent from '../FieldComponent';
import Button from './Button';
import ComponentsPicker from './ComponentsPicker';
import ComponentWrapper from './ComponentWrapper';
import Label from './Label';
import RoundCTA from './RoundCTA';
import Wrapper from './Wrapper';

const DynamicZone = ({ name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const {
    addComponentToDynamicZone,
    // allLayoutData,
    layout,
    modifiedData,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
  } = useDataManager();
  const getDynamicDisplayedComponents = useCallback(() => {
    return get(modifiedData, [name], []).map(data => data.__component);
  }, [modifiedData, name]);
  // const getDynamicComponentSchemaData = useCallback(
  //   compoUid => {
  //     return get(allLayoutData, ['components', compoUid], {});
  //   },
  //   [allLayoutData]
  // );

  const dynamicZoneAvailableComponents = get(
    layout,
    ['schema', 'attributes', name, 'components'],
    []
  );
  const displayInfo = isOver && !isOpen;
  const handleMouseEvent = () => setIsOver(prev => !prev);
  const metas = get(layout, ['metadatas', name, 'edit'], {});
  const dynamicDisplayedComponentsLength = getDynamicDisplayedComponents()
    .length;

  return (
    <>
      {getDynamicDisplayedComponents().length > 0 && (
        <Label>
          <p>{metas.label}</p>
          <p>{metas.description}</p>
        </Label>
      )}
      {getDynamicDisplayedComponents().map((componentUid, index) => {
        // TODO when available
        // const icon = getDynamicComponentSchemaData(componentUid);

        const showDownIcon =
          dynamicDisplayedComponentsLength > 0 &&
          index < dynamicDisplayedComponentsLength - 1;
        const showUpIcon = dynamicDisplayedComponentsLength > 0 && index > 0;

        return (
          <ComponentWrapper key={index}>
            (TEMP: {componentUid})
            {showDownIcon && (
              <RoundCTA
                style={{ top: -15, right: 30 }}
                onClick={() => moveComponentDown(name, index)}
              >
                <i className="fa fa-arrow-down" />
              </RoundCTA>
            )}
            {showUpIcon && (
              <RoundCTA
                style={{ top: -15, right: 45 }}
                onClick={() => moveComponentUp(name, index)}
              >
                <i className="fa fa-arrow-up" />
              </RoundCTA>
            )}
            <RoundCTA
              style={{ top: -15, right: 0 }}
              onClick={() => removeComponentFromDynamicZone(name, index)}
            >
              <i className="fa fa-trash" />
            </RoundCTA>
            <FieldComponent
              componentUid={componentUid}
              label=""
              name={`${name}.${index}`}
              isFromDynamicZone
            />
          </ComponentWrapper>
        );
      })}
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
