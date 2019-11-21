import React, { useCallback, useState } from 'react';

import { get } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import DynamicComponentCard from '../DynamicComponentCard';
import FieldComponent from '../FieldComponent';
import Button from './Button';
import ComponentsPicker from './ComponentsPicker';
import ComponentWrapper from './ComponentWrapper';
import Label from './Label';
import RoundCTA from './RoundCTA';
import Wrapper from './Wrapper';

const DynamicZone = ({ max, min, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    addComponentToDynamicZone,
    formErrors,
    layout,
    modifiedData,
    moveComponentUp,
    moveComponentDown,
    removeComponentFromDynamicZone,
  } = useDataManager();

  const { components } = useEditView();

  const getDynamicDisplayedComponents = useCallback(() => {
    return get(modifiedData, [name], []).map(data => data.__component);
  }, [modifiedData, name]);

  const getDynamicComponentSchemaData = componentUid => {
    const component = components.find(compo => compo.uid === componentUid);
    const { schema } = component;

    return schema;
  };

  const getDynamicComponentIcon = componentUid => {
    const {
      info: { icon },
    } = getDynamicComponentSchemaData(componentUid);

    return icon;
  };

  const dynamicZoneErrors = Object.keys(formErrors)
    .filter(key => {
      return key === name;
    })
    .map(key => formErrors[key]);

  const dynamicZoneAvailableComponents = get(
    layout,
    ['schema', 'attributes', name, 'components'],
    []
  );

  const metas = get(layout, ['metadatas', name, 'edit'], {});
  const dynamicDisplayedComponentsLength = getDynamicDisplayedComponents()
    .length;
  const missingComponentNumber = min - dynamicDisplayedComponentsLength;
  const hasError = dynamicZoneErrors.length > 0;
  const hasMinError =
    dynamicZoneErrors.length > 0 &&
    get(dynamicZoneErrors, [0, 'id'], '').includes('min');

  const hasRequiredError = hasError && !hasMinError;

  return (
    <>
      {getDynamicDisplayedComponents().length > 0 && (
        <Label>
          <p>{metas.label}</p>
          <p>{metas.description}</p>
        </Label>
      )}

      <ComponentWrapper>
        {getDynamicDisplayedComponents().map((componentUid, index) => {
          const showDownIcon =
            dynamicDisplayedComponentsLength > 0 &&
            index < dynamicDisplayedComponentsLength - 1;
          const showUpIcon = dynamicDisplayedComponentsLength > 0 && index > 0;

          return (
            <div key={index}>
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
                style={{ top: -15, right: 15 }}
                onClick={() => removeComponentFromDynamicZone(name, index)}
              >
                <i className="far fa-trash-alt" />
              </RoundCTA>
              <FieldComponent
                componentUid={componentUid}
                icon={getDynamicComponentIcon(componentUid)}
                label=""
                name={`${name}.${index}`}
                isFromDynamicZone
              />
            </div>
          );
        })}
      </ComponentWrapper>
      <Wrapper>
        <Button
          type="button"
          hasError={hasError}
          className={isOpen && 'isOpen'}
          onClick={() => {
            if (dynamicDisplayedComponentsLength < max) {
              setIsOpen(prev => !prev);
            } else {
              strapi.notification.info(
                `${pluginId}.components.components.notification.info.maximum-requirement`
              );
            }
          }}
        />
        {hasRequiredError && !isOpen && (
          <div className="error-label">Component is required</div>
        )}
        {hasMinError && (
          <div className="error-label">
            {' '}
            {missingComponentNumber} missing components
          </div>
        )}
        <div className="info">
          <FormattedMessage
            id={`${pluginId}.components.DynamicZone.add-compo`}
            values={{ componentName: name }}
          />
        </div>
        <ComponentsPicker isOpen={isOpen}>
          <div>
            <p className="componentPickerTitle">
              <FormattedMessage
                id={`${pluginId}.components.DynamicZone.pick-compo`}
              />
            </p>
            <div className="componentsList">
              {dynamicZoneAvailableComponents.map(componentUid => {
                return (
                  <DynamicComponentCard
                    key={componentUid}
                    componentUid={componentUid}
                    icon={getDynamicComponentIcon(componentUid)}
                    onClick={() => {
                      setIsOpen(false);
                      const shouldCheckErrors = hasError;
                      addComponentToDynamicZone(
                        name,
                        componentUid,
                        shouldCheckErrors
                      );
                    }}
                  />
                );
              })}
            </div>
          </div>
        </ComponentsPicker>
      </Wrapper>
    </>
  );
};

DynamicZone.defaultProps = {
  max: Infinity,
  min: -Infinity,
};

DynamicZone.propTypes = {
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
};

export { DynamicZone };
export default DynamicZone;
