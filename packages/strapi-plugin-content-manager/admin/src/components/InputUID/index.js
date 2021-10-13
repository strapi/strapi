import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Sync } from '@buffetjs/icons';
import { ErrorMessage, Description } from '@buffetjs/styles';
import { Label, Error } from '@buffetjs/core';
import { useDebounce, useClickAwayListener } from '@buffetjs/hooks';
import styled from 'styled-components';
import {
  request,
  LabelIconWrapper,
  LoadingIndicator,
  useGlobalContext,
  useContentManagerEditViewDataManager,
} from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
import getTrad from '../../utils/getTrad';
import pluginId from '../../pluginId';
import getRequestUrl from '../../utils/getRequestUrl';
import RightLabel from './RightLabel';
import Options from './Options';
import RegenerateButton from './RegenerateButton';
import RightContent from './RightContent';
import Input from './InputUID';
import Wrapper from './Wrapper';
import SubLabel from './SubLabel';
import UID_REGEX from './regex';
import RightContentLabel from './RightContentLabel';

const InputContainer = styled.div`
  position: relative;
`;
const Name = styled(Label)`
  display: block;
  text-transform: capitalize;
  margin-bottom: 1rem;
`;

// This component should be in buffetjs. It will be used in the media lib.
// This component will be the strapi custom dropdown component.
// TODO : Make this component generic -> InputDropdown.
// TODO : Use the Compounds components pattern
// https://blog.bitsrc.io/understanding-compound-components-in-react-23c4b84535b5
const InputUID = ({
  attribute,
  contentTypeUID,
  description,
  error: inputError,
  label: inputLabel,
  labelIcon,
  name,
  onChange,
  validations,
  value,
  editable,
  ...inputProps
}) => {
  const { modifiedData, initialData, layout } = useContentManagerEditViewDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(true);
  const [isCustomized, setIsCustomized] = useState(false);
  const [label, setLabel] = useState();
  const debouncedValue = useDebounce(value, 300);
  const debouncedTargetFieldValue = useDebounce(modifiedData[attribute.targetField], 300);
  const wrapperRef = useRef(null);
  const generateUid = useRef();
  const initialValue = initialData[name];
  const createdAtName = get(layout, ['options', 'timestamps', 0]);
  const isCreation = !initialData[createdAtName];
  const { formatMessage } = useGlobalContext();

  generateUid.current = async (shouldSetInitialValue = false) => {
    setIsLoading(true);
    const requestURL = getRequestUrl('uid/generate');
    try {
      const { data } = await request(requestURL, {
        method: 'POST',
        body: {
          contentTypeUID,
          field: name,
          data: modifiedData,
        },
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
      const data = await request(requestURL, {
        method: 'POST',
        body: {
          contentTypeUID,
          field: name,
          value: value ? value.trim() : '',
        },
      });
      setAvailability(data);

      if (data.suggestion) {
        setIsSuggestionOpen(true);
      }
      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  };

  // FIXME: we need to find a better way to autofill the input when it is required.
  // useEffect(() => {
  //   if (!value && validations.required) {
  //     generateUid.current(true);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

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

  useClickAwayListener(wrapperRef, () => setIsSuggestionOpen(false));

  const handleFocus = () => {
    if (availability && availability.suggestion) {
      setIsSuggestionOpen(true);
    }
  };

  const handleSuggestionClick = () => {
    setIsSuggestionOpen(false);
    onChange({ target: { name, value: availability.suggestion, type: 'text' } });
  };

  const handleGenerateMouseEnter = () => {
    setLabel('regenerate');
  };

  const handleGenerateMouseLeave = () => {
    setLabel(null);
  };

  const handleChange = (e, canCheck, dispatch) => {
    if (!canCheck) {
      dispatch({
        type: 'SET_CHECK',
      });
    }

    dispatch({
      type: 'SET_ERROR',
      error: null,
    });

    if (e.target.value && isCreation) {
      setIsCustomized(true);
    }

    onChange(e);
  };

  return (
    <Error
      name={name}
      inputError={inputError}
      type="text"
      validations={{ ...validations, regex: UID_REGEX }}
    >
      {({ canCheck, onBlur, error, dispatch }) => {
        const hasError = Boolean(error);

        return (
          <Wrapper ref={wrapperRef}>
            <Name htmlFor={name}>
              <span>{inputLabel}</span>
              {labelIcon && (
                <LabelIconWrapper title={labelIcon.title}>{labelIcon.icon}</LabelIconWrapper>
              )}
            </Name>
            <InputContainer>
              <Input
                {...inputProps}
                containsEndAdornment={editable}
                editable={editable}
                error={hasError}
                onFocus={handleFocus}
                name={name}
                onChange={e => handleChange(e, canCheck, dispatch)}
                type="text"
                onBlur={onBlur}
                // eslint-disable-next-line no-irregular-whitespace
                value={value || ''}
              />
              <RightContent>
                {label && (
                  <RightContentLabel color="blue">
                    {formatMessage({
                      id: getTrad('components.uid.regenerate'),
                    })}
                  </RightContentLabel>
                )}
                {!isLoading && !label && availability && (
                  <RightLabel
                    isAvailable={availability.isAvailable || value === availability.suggestion}
                  />
                )}
                {editable && (
                  <RegenerateButton
                    onMouseEnter={handleGenerateMouseEnter}
                    onMouseLeave={handleGenerateMouseLeave}
                    onClick={() => generateUid.current()}
                  >
                    {isLoading ? (
                      <LoadingIndicator small />
                    ) : (
                      <Sync fill={label ? '#007EFF' : '#B5B7BB'} width="11px" height="11px" />
                    )}
                  </RegenerateButton>
                )}
              </RightContent>
              {availability && availability.suggestion && isSuggestionOpen && (
                <FormattedMessage id={`${pluginId}.components.uid.suggested`}>
                  {msg => (
                    <Options
                      title={msg}
                      options={[
                        {
                          id: 'suggestion',
                          label: availability.suggestion,
                          onClick: handleSuggestionClick,
                        },
                      ]}
                    />
                  )}
                </FormattedMessage>
              )}
            </InputContainer>
            {!hasError && description && <SubLabel as={Description}>{description}</SubLabel>}
            {hasError && <SubLabel as={ErrorMessage}>{error}</SubLabel>}
          </Wrapper>
        );
      }}
    </Error>
  );
};

InputUID.propTypes = {
  attribute: PropTypes.object.isRequired,
  contentTypeUID: PropTypes.string.isRequired,
  description: PropTypes.string,
  editable: PropTypes.bool,
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
  labelIcon: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    title: PropTypes.string,
  }),
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  validations: PropTypes.object,
  value: PropTypes.string,
};

InputUID.defaultProps = {
  description: '',
  editable: false,
  error: null,
  labelIcon: null,
  validations: {},
  value: '',
};

export default InputUID;
