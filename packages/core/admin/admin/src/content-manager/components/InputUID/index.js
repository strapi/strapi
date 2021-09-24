import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { TextInput } from '@strapi/parts/TextInput';
import { Text } from '@strapi/parts/Text';
import Reload from '@strapi/icons/Reload';
import AlertSucessIcon from '@strapi/icons/AlertSucessIcon';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import LoadingIcon from '@strapi/icons/LoadingIcon';
import { axiosInstance } from '../../../core/utils';
import { getRequestUrl } from '../../utils';
import useDebounce from './useDebounce';
import UID_REGEX from './regex';
import {
  EndActionWrapper,
  FieldActionWrapper,
  TextValidation,
  LoadingWrapper,
} from './endActionStyle';

const InputUID = ({
  attribute,
  contentTypeUID,
  description,
  disabled,
  error,
  intlLabel,
  labelAction,
  name,
  onChange,
  value,
  placeholder,
}) => {
  const { modifiedData, initialData, layout } = useCMEditViewDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const debouncedValue = useDebounce(value, 300);
  const generateUid = useRef();
  const initialValue = initialData[name];
  const { formatMessage } = useIntl();
  const createdAtName = get(layout, ['options', 'timestamps', 0]);
  const isCreation = !initialData[createdAtName];
  const debouncedTargetFieldValue = useDebounce(modifiedData[attribute.targetField], 300);
  const [isCustomized, setIsCustomized] = useState(false);
  const [regenerateLabel, setRegenerateLabel] = useState(null);

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  const formattedPlaceholder = placeholder
    ? formatMessage(
        { id: placeholder.id, defaultMessage: placeholder.defaultMessage },
        { ...placeholder.values }
      )
    : '';

  generateUid.current = async (shouldSetInitialValue = false) => {
    setIsLoading(true);
    const requestURL = getRequestUrl('uid/generate');
    try {
      const {
        data: { data },
      } = await axiosInstance.post(requestURL, {
        contentTypeUID,
        field: name,
        data: modifiedData,
      });
      onChange({ target: { name, value: data, type: 'text' } }, shouldSetInitialValue);
      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  };

  const checkAvailability = async () => {
    setIsLoading(true);

    const requestURL = getRequestUrl('uid/check-availability');

    if (!value) {
      return;
    }

    try {
      const { data } = await axiosInstance.post(requestURL, {
        contentTypeUID,
        field: name,
        value: value ? value.trim() : '',
      });

      setAvailability(data);

      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  };

  // // FIXME: we need to find a better way to autofill the input when it is required.
  useEffect(() => {
    if (!value && attribute.required) {
      generateUid.current(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      debouncedValue &&
      debouncedValue.trim().match(UID_REGEX) &&
      debouncedValue !== initialValue
    ) {
      checkAvailability();
    }
    if (!debouncedValue) {
      setAvailability(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue, initialValue]);

  useEffect(() => {
    let timer;

    if (availability && availability.isAvailable) {
      timer = setTimeout(() => {
        setAvailability(null);
      }, 4000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [availability]);

  useEffect(() => {
    if (
      !isCustomized &&
      isCreation &&
      debouncedTargetFieldValue &&
      modifiedData[attribute.targetField]
    ) {
      generateUid.current(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTargetFieldValue, isCustomized, isCreation]);

  const handleGenerateMouseEnter = () => {
    setRegenerateLabel('Regenerate');
  };

  const handleGenerateMouseLeave = () => {
    setRegenerateLabel(null);
  };

  const handleChange = e => {
    if (e.target.value && isCreation) {
      setIsCustomized(true);
    }

    onChange(e);
  };

  const formattedError = error ? formatMessage({ id: error, defaultMessage: error }) : undefined;

  return (
    <TextInput
      disabled={disabled}
      error={formattedError}
      endAction={
        <EndActionWrapper>
          {availability && availability.isAvailable && !regenerateLabel && (
            <TextValidation alignItems="center" justifyContent="flex-end">
              <AlertSucessIcon />
              <Text textColor="success600" small>
                Available
              </Text>
            </TextValidation>
          )}
          {availability && !availability.isAvailable && !regenerateLabel && (
            <TextValidation notAvailable alignItems="center" justifyContent="flex-end">
              <AlertWarningIcon />
              <Text textColor="danger600" small>
                Unavailable
              </Text>
            </TextValidation>
          )}
          {regenerateLabel && (
            <TextValidation alignItems="center" justifyContent="flex-end">
              <Text textColor="primary600" small>
                {regenerateLabel}
              </Text>
            </TextValidation>
          )}
          <FieldActionWrapper
            onClick={() => generateUid.current()}
            label="regenerate"
            onMouseEnter={handleGenerateMouseEnter}
            onMouseLeave={handleGenerateMouseLeave}
          >
            {isLoading ? (
              <LoadingWrapper>
                <LoadingIcon />
              </LoadingWrapper>
            ) : (
              <Reload />
            )}
          </FieldActionWrapper>
        </EndActionWrapper>
      }
      hint={hint}
      label={label}
      labelAction={labelAction}
      name={name}
      onChange={handleChange}
      placeholder={formattedPlaceholder}
      value={value || ''}
    />
    // <Error
    //   name={name}
    //   inputError={inputError}
    //   type="text"
    //   validations={{ ...validations, regex: UID_REGEX }}
    // >
    //   {({ canCheck, onBlur, error, dispatch }) => {
    //     const hasError = Boolean(error);

    //     return (
    //       <Wrapper ref={wrapperRef}>
    //         <Name htmlFor={name}>
    //           <span>{inputLabel}</span>
    //           {labelIcon && (
    //             <LabelIconWrapper title={labelIcon.title}>{labelIcon.icon}</LabelIconWrapper>
    //           )}
    //         </Name>
    //         <InputContainer>
    //           <Input
    //             {...inputProps}
    //             containsEndAdornment={editable}
    //             editable={editable}
    //             error={hasError}
    //             onFocus={handleFocus}
    //             name={name}
    //             onChange={e => handleChange(e, canCheck, dispatch)}
    //             type="text"
    //             onBlur={onBlur}
    //             // eslint-disable-next-line no-irregular-whitespace
    //             value={value || ''}
    //           />
    //           <RightContent>
    //             {label && (
    //               <RightContentLabel color="blue">
    //                 {formatMessage({
    //                   id: getTrad('components.uid.regenerate'),
    //                 })}
    //               </RightContentLabel>
    //             )}
    //             {!isLoading && !label && availability && (
    //               <RightLabel
    //                 isAvailable={availability.isAvailable || value === availability.suggestion}
    //               />
    //             )}
    //             {editable && (
    //               <RegenerateButton
    //                 onMouseEnter={handleGenerateMouseEnter}
    //                 onMouseLeave={handleGenerateMouseLeave}
    //                 onClick={() => generateUid.current()}
    //               >
    //                 {isLoading ? (
    //                   <LoadingIndicator small />
    //                 ) : (
    //                   <Sync fill={label ? '#007EFF' : '#B5B7BB'} width="11px" height="11px" />
    //                 )}
    //               </RegenerateButton>
    //             )}
    //           </RightContent>
    //           {availability && availability.suggestion && isSuggestionOpen && (
    //             <Options
    //               title={formatMessage({ id: getTrad('components.uid.suggested') })}
    //               options={[
    //                 {
    //                   id: 'suggestion',
    //                   label: availability.suggestion,
    //                   onClick: handleSuggestionClick,
    //                 },
    //               ]}
    //             />
    //           )}
    //         </InputContainer>
    //         {!hasError && description && <SubLabel as={Description}>{description}</SubLabel>}
    //         {hasError && <SubLabel as={ErrorMessage}>{error}</SubLabel>}
    //       </Wrapper>
    //     );
    //   }}
    // </Error>
  );
};

InputUID.propTypes = {
  attribute: PropTypes.shape({
    targetField: PropTypes.string,
    required: PropTypes.bool,
  }).isRequired,
  contentTypeUID: PropTypes.string.isRequired,
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
};

InputUID.defaultProps = {
  description: undefined,
  disabled: false,
  error: undefined,
  labelAction: undefined,
  placeholder: undefined,
  value: '',
};

// export default memo(InputUID, isEqual);
export default InputUID;
