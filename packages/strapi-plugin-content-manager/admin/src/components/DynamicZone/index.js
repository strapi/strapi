import React, { useCallback, useState } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Arrow } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import useEditView from '../../hooks/useEditView';
import DynamicComponentCard from '../DynamicComponentCard';
import FieldComponent from '../FieldComponent';
import Button from './Button';
import ComponentsPicker from './ComponentsPicker';
import ComponentWrapper from './ComponentWrapper';
import DynamicZoneWrapper from './DynamicZoneWrapper';
import Label from './Label';
import RoundCTA from './RoundCTA';
import Wrapper from './Wrapper';

/* eslint-disable react/no-array-index-key */

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

  const getDynamicComponentInfos = componentUid => {
    const {
      info: { icon, name },
    } = getDynamicComponentSchemaData(componentUid);

    return { icon, name };
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
  const hasMaxError =
    hasError &&
    get(dynamicZoneErrors, [0, 'id'], '') ===
      'components.Input.error.validation.max';

  return (
    <DynamicZoneWrapper>
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
              <div className="arrow-icons">
                {showDownIcon && (
                  <RoundCTA
                    className="arrow-btn arrow-down"
                    onClick={() => moveComponentDown(name, index)}
                  >
                    <Arrow />
                  </RoundCTA>
                )}
                {showUpIcon && (
                  <RoundCTA
                    className="arrow-btn arrow-up"
                    onClick={() => moveComponentUp(name, index)}
                  >
                    <Arrow />
                  </RoundCTA>
                )}
              </div>

              <RoundCTA
                onClick={() => removeComponentFromDynamicZone(name, index)}
              >
                <FontAwesomeIcon icon="trash" />
              </RoundCTA>
              <FieldComponent
                componentUid={componentUid}
                componentFriendlyName={
                  getDynamicComponentInfos(componentUid).name
                }
                icon={getDynamicComponentInfos(componentUid).icon}
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
                `${pluginId}.components.notification.info.maximum-requirement`
              );
            }
          }}
        />
        {hasRequiredError && !isOpen && !hasMaxError && (
          <div className="error-label">Component is required</div>
        )}
        {hasMaxError && !isOpen && (
          <div className="error-label">
            <FormattedMessage id="components.Input.error.validation.max" />
          </div>
        )}
        {hasMinError && !isOpen && (
          <div className="error-label">
            <FormattedMessage
              id={`${pluginId}.components.DynamicZone.missing${
                missingComponentNumber > 1 ? '.plural' : '.singular'
              }`}
              values={{ count: missingComponentNumber }}
            />
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
                const { icon, name: friendlyName } = getDynamicComponentInfos(
                  componentUid
                );

                return (
                  <DynamicComponentCard
                    key={componentUid}
                    componentUid={componentUid}
                    friendlyName={friendlyName}
                    icon={icon}
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
    </DynamicZoneWrapper>
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
