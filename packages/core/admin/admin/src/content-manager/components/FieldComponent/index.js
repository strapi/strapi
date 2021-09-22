/* eslint-disable  import/no-cycle */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import size from 'lodash/size';
import { FormattedMessage, useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import isEqual from 'react-fast-compare';
import { NotAllowedInput, LabelIconWrapper } from '@strapi/helper-plugin';
import { getTrad } from '../../utils';
import ComponentInitializer from '../ComponentInitializer';
import NonRepeatableComponent from '../NonRepeatableComponent';
import RepeatableComponent from '../RepeatableComponent';
import connect from './utils/connect';
import select from './utils/select';
import ComponentIcon from './ComponentIcon';
import Label from './Label';
import Reset from './ResetComponent';
import Wrapper from './Wrapper';

const FieldComponent = ({
  componentFriendlyName,
  componentUid,
  icon,
  intlLabel,
  isCreatingEntry,
  isFromDynamicZone,
  isRepeatable,
  isNested,
  labelAction,
  max,
  min,
  name,
  // Passed thanks to the connect function
  hasChildrenAllowedFields,
  hasChildrenReadableFields,
  isReadOnly,
  componentValue,
  removeComponentFromField,
}) => {
  // const { formatMessage } = useIntl();
  const componentValueLength = size(componentValue);
  const isInitialized = componentValue !== null || isFromDynamicZone;
  const showResetComponent =
    !isRepeatable && isInitialized && !isFromDynamicZone && hasChildrenAllowedFields;

  if (!hasChildrenAllowedFields && isCreatingEntry) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  if (!hasChildrenAllowedFields && !isCreatingEntry && !hasChildrenReadableFields) {
    return <NotAllowedInput labelAction={labelAction} intlLabel={intlLabel} name={name} />;
  }

  return <div>TODO</div>;

  // return (
  //   <Wrapper className="col-12" isFromDynamicZone={isFromDynamicZone}>
  //     {isFromDynamicZone && (
  //       <ComponentIcon title={componentFriendlyName}>
  //         <div className="component_name">
  //           <div className="component_icon">
  //             <FontAwesomeIcon icon={icon} title={componentFriendlyName} />
  //           </div>
  //           <p>{componentFriendlyName}</p>
  //         </div>
  //       </ComponentIcon>
  //     )}
  //     <Label>
  //       <span>
  //         {label}&nbsp;
  //         {isRepeatable && `(${componentValueLength})`}
  //       </span>
  //       {formattedLabelIcon && (
  //         <LabelIconWrapper title={formattedLabelIcon.title}>
  //           {formattedLabelIcon.icon}
  //         </LabelIconWrapper>
  //       )}
  //     </Label>
  //     {showResetComponent && (
  //       <Reset
  //         onClick={e => {
  //           e.preventDefault();
  //           e.stopPropagation();
  //           removeComponentFromField(name, componentUid);
  //         }}
  //       >
  //         <FormattedMessage id={getTrad('components.reset-entry')} />
  //         <div />
  //       </Reset>
  //     )}
  //     {!isRepeatable && !isInitialized && (
  //       <ComponentInitializer componentUid={componentUid} name={name} isReadOnly={isReadOnly} />
  //     )}

  //     {!isRepeatable && isInitialized && (
  //       <NonRepeatableComponent
  //         componentUid={componentUid}
  //         isFromDynamicZone={isFromDynamicZone}
  //         name={name}
  //       />
  //     )}
  //     {isRepeatable && (
  //       <RepeatableComponent
  //         componentValue={componentValue}
  //         componentValueLength={componentValueLength}
  //         componentUid={componentUid}
  //         isNested={isNested}
  //         isReadOnly={isReadOnly}
  //         max={max}
  //         min={min}
  //         name={name}
  //       />
  //     )}
  //   </Wrapper>
  // );
};

FieldComponent.defaultProps = {
  componentValue: null,
  componentFriendlyName: null,
  hasChildrenAllowedFields: false,
  hasChildrenReadableFields: false,
  icon: 'smile',
  isFromDynamicZone: false,
  isReadOnly: false,
  isRepeatable: false,
  isNested: false,
  labelAction: undefined,
  max: Infinity,
  min: -Infinity,
};

FieldComponent.propTypes = {
  componentFriendlyName: PropTypes.string,
  componentUid: PropTypes.string.isRequired,
  componentValue: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  hasChildrenAllowedFields: PropTypes.bool,
  hasChildrenReadableFields: PropTypes.bool,
  icon: PropTypes.string,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFromDynamicZone: PropTypes.bool,
  isReadOnly: PropTypes.bool,
  isRepeatable: PropTypes.bool,
  isNested: PropTypes.bool,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  max: PropTypes.number,
  min: PropTypes.number,
  name: PropTypes.string.isRequired,
  removeComponentFromField: PropTypes.func.isRequired,
};

const Memoized = memo(FieldComponent, isEqual);

export default connect(Memoized, select);
