import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Regenerate } from '@buffetjs/icons';
import { ErrorMessage as BaseErrorMessage } from '@buffetjs/styles';
import { Label, Error } from '@buffetjs/core';
import styled from 'styled-components';
import { request, LoadingIndicator, useClickAwayListener, useDebounce } from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import RightLabel from './RightLabel';
import Options from './Options';
import RegenerateButton from './RegenerateButton';
import RightContent from './RightContent';
import Input from './InputUID';

// There is no need to create additional files for those little components.
const Wrapper = styled.div`
  position: relative;
  padding-bottom: 23px;
`;
const InputContainer = styled.div`
  position: relative;
`;
const ErrorMessage = styled(BaseErrorMessage)`
  padding-top: 10px;
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
  error: inputError,
  required,
  name,
  value,
  contentTypeUID,
  validations,
  onChange,
}) => {
  const { modifiedData, initialData } = useDataManager();
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(true);
  const [label, setLabel] = useState();
  const debouncedValue = useDebounce(value, 300);
  const wrapperRef = useRef(null);
  const initialValue = initialData[name];

  const checkAvailability = async () => {
    setIsLoading(true);
    const requestURL = '/content-manager/explorer/uid/check-availability';
    try {
      const data = await request(requestURL, {
        method: 'POST',
        body: {
          contentTypeUID,
          field: name,
          value: value || null,
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

  const generate = async () => {
    setIsLoading(true);
    const requestURL = '/content-manager/explorer/uid/generate';
    try {
      const { data } = await request(requestURL, {
        method: 'POST',
        body: {
          contentTypeUID,
          field: name,
          data: modifiedData,
        },
      });
      onChange({ target: { name, value: data, type: 'text' } });
      setIsLoading(false);
    } catch (err) {
      console.error({ err });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!value && required) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debouncedValue && debouncedValue !== initialValue) {
      checkAvailability();
    }
    if (!debouncedValue) {
      setAvailability(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

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

    onChange(e);
  };

  return (
    <Error name={name} inputError={inputError} type="text" validations={validations}>
      {({ canCheck, onBlur, error, dispatch }) => {
        const hasError = error && error !== null;

        return (
          <Wrapper ref={wrapperRef}>
            <Name htmlFor={name}>{name}</Name>
            <InputContainer>
              <Input
                error={hasError}
                onFocus={handleFocus}
                name={name}
                onChange={e => handleChange(e, canCheck, dispatch)}
                type="text"
                onBlur={onBlur}
                value={value}
              />
              <RightContent>
                <RightLabel availability={availability} label={label} />
                <RegenerateButton
                  onMouseEnter={handleGenerateMouseEnter}
                  onMouseLeave={handleGenerateMouseLeave}
                  onClick={generate}
                >
                  {isLoading ? (
                    <LoadingIndicator />
                  ) : (
                    <Regenerate fill={label ? '#007EFF' : '#B5B7BB'} width="15px" height="15px" />
                  )}
                </RegenerateButton>
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
            {hasError && <ErrorMessage>{error}</ErrorMessage>}
          </Wrapper>
        );
      }}
    </Error>
  );
};

InputUID.propTypes = {
  contentTypeUID: PropTypes.string.isRequired,
  error: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  validations: PropTypes.object,
  value: PropTypes.string,
};

InputUID.defaultProps = {
  error: null,
  required: false,
  validations: {},
  value: '',
};

export default InputUID;
