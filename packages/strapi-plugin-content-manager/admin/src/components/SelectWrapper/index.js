import React, { useCallback, useState, useEffect, useMemo, memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';
import { findIndex, get, isArray, isEmpty } from 'lodash';
import { request } from 'strapi-helper-plugin';
import { Flex, Text, Padded } from '@buffetjs/core';
import pluginId from '../../pluginId';
import useDataManager from '../../hooks/useDataManager';
import NotAllowedInput from '../NotAllowedInput';
import SelectOne from '../SelectOne';
import SelectMany from '../SelectMany';
import ClearIndicator from './ClearIndicator';
import DropdownIndicator from './DropdownIndicator';
import IndicatorSeparator from './IndicatorSeparator';
import Option from './Option';
import { A, BaselineAlignment } from './components';
import { connect, select, styles } from './utils';

const initialPaginationState = {
  _contains: '',
  _limit: 20,
  _start: 0,
};
function SelectWrapper({
  description,
  editable,
  label,
  isCreatingEntry,
  isFieldAllowed,
  isFieldReadable,
  mainField,
  name,
  relationType,
  targetModel,
  placeholder,
  queryInfos,
}) {
  // Disable the input in case of a polymorphic relation
  const isMorph = useMemo(() => relationType.toLowerCase().includes('morph'), [relationType]);
  const { addRelation, modifiedData, moveRelation, onChange, onRemoveRelation } = useDataManager();
  const { pathname } = useLocation();

  const value = get(modifiedData, name, null);
  const [state, setState] = useState(initialPaginationState);
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    return options.filter(option => {
      if (!isEmpty(value)) {
        // SelectMany
        if (Array.isArray(value)) {
          return findIndex(value, o => o.id === option.value.id) === -1;
        }

        // SelectOne
        return get(value, 'id', '') !== option.value.id;
      }

      return true;
    });
  }, [options, value]);

  const { endPoint, containsKey, defaultParams, shouldDisplayRelationLink } = queryInfos;

  const isSingle = ['oneWay', 'oneToOne', 'manyToOne', 'oneToManyMorph', 'oneToOneMorph'].includes(
    relationType
  );

  const idsToOmit = useMemo(() => {
    if (!value) {
      return [];
    }

    if (isSingle) {
      return [value.id];
    }

    return value.map(val => val.id);
  }, [isSingle, value]);

  const getData = useCallback(
    async signal => {
      // Currently polymorphic relations are not handled
      if (isMorph) {
        setIsLoading(false);

        return;
      }

      if (!isFieldAllowed) {
        setIsLoading(false);

        return;
      }

      setIsLoading(true);

      const params = { _limit: state._limit, ...defaultParams };

      if (state._contains) {
        params[containsKey] = state._contains;
      }

      try {
        const data = await request(endPoint, {
          method: 'POST',
          params,
          signal,
          body: { idsToOmit },
        });

        const formattedData = data.map(obj => {
          return { value: obj, label: obj[mainField.name] };
        });

        setOptions(prevState =>
          prevState.concat(formattedData).filter((obj, index) => {
            const objIndex = prevState.findIndex(el => el.value.id === obj.value.id);

            if (objIndex === -1) {
              return true;
            }

            return prevState.findIndex(el => el.value.id === obj.value.id) === index;
          })
        );
        setIsLoading(false);
      } catch (err) {
        // Silent
      }
    },
    [
      isMorph,
      isFieldAllowed,
      state._limit,
      state._contains,
      defaultParams,
      containsKey,
      endPoint,
      idsToOmit,
      mainField.name,
    ]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    if (isOpen) {
      getData(signal);
    }

    return () => abortController.abort();
  }, [getData, isOpen]);

  const handleInputChange = (inputValue, { action }) => {
    if (action === 'input-change') {
      setState(prevState => {
        if (prevState._contains === inputValue) {
          return prevState;
        }

        return { ...prevState, _contains: inputValue, _start: 0 };
      });
    }

    return inputValue;
  };

  const handleMenuScrollToBottom = () => {
    setState(prevState => ({ ...prevState, _limit: prevState._limit + 20 }));
  };

  const handleMenuClose = () => {
    setState(initialPaginationState);
    setIsOpen(false);
  };

  const handleChange = value => {
    onChange({ target: { name, value: value ? value.value : value } });
  };

  const handleAddRelation = value => {
    addRelation({ target: { name, value } });
  };

  const handleMenuOpen = () => {
    setIsOpen(true);
  };

  const to = `/plugins/${pluginId}/collectionType/${targetModel}/${value ? value.id : null}`;

  const link = useMemo(() => {
    if (!value) {
      return null;
    }

    if (!shouldDisplayRelationLink) {
      return null;
    }

    return (
      <Link to={{ pathname: to, state: { from: pathname } }}>
        <FormattedMessage id="content-manager.containers.Edit.seeDetails">
          {msg => <A color="mediumBlue">{msg}</A>}
        </FormattedMessage>
      </Link>
    );
  }, [shouldDisplayRelationLink, pathname, to, value]);

  const Component = isSingle ? SelectOne : SelectMany;
  const associationsLength = isArray(value) ? value.length : 0;

  const isDisabled = useMemo(() => {
    if (isMorph) {
      return true;
    }

    if (!isCreatingEntry) {
      return (!isFieldAllowed && isFieldReadable) || !editable;
    }

    return !editable;
  }, [isMorph, isCreatingEntry, editable, isFieldAllowed, isFieldReadable]);

  if (!isFieldAllowed && isCreatingEntry) {
    return <NotAllowedInput label={label} />;
  }

  if (!isCreatingEntry && !isFieldAllowed && !isFieldReadable) {
    return <NotAllowedInput label={label} />;
  }

  return (
    <Padded>
      <BaselineAlignment />
      <Flex justifyContent="space-between">
        <Text fontWeight="semiBold">
          {label}
          {!isSingle && ` (${associationsLength})`}
        </Text>
        {isSingle && link}
      </Flex>
      {!isEmpty(description) && (
        <Padded top size="xs">
          <BaselineAlignment />
          <Text fontSize="sm" color="grey" lineHeight="12px" ellipsis>
            {description}
          </Text>
        </Padded>
      )}
      <Padded top size="sm">
        <BaselineAlignment />

        <Component
          addRelation={handleAddRelation}
          components={{ ClearIndicator, DropdownIndicator, IndicatorSeparator, Option }}
          displayNavigationLink={shouldDisplayRelationLink}
          id={name}
          isDisabled={isDisabled}
          isLoading={isLoading}
          isClearable
          mainField={mainField}
          move={moveRelation}
          name={name}
          options={filteredOptions}
          onChange={handleChange}
          onInputChange={handleInputChange}
          onMenuClose={handleMenuClose}
          onMenuOpen={handleMenuOpen}
          onMenuScrollToBottom={handleMenuScrollToBottom}
          onRemove={onRemoveRelation}
          placeholder={
            isEmpty(placeholder) ? (
              <FormattedMessage id={`${pluginId}.containers.Edit.addAnItem`} />
            ) : (
              placeholder
            )
          }
          styles={styles}
          targetModel={targetModel}
          value={value}
        />
      </Padded>
      <div style={{ marginBottom: 28 }} />
    </Padded>
  );
}

SelectWrapper.defaultProps = {
  editable: true,
  description: '',
  label: '',
  isFieldAllowed: true,
  placeholder: '',
};

SelectWrapper.propTypes = {
  editable: PropTypes.bool,
  description: PropTypes.string,
  label: PropTypes.string,
  isCreatingEntry: PropTypes.bool.isRequired,
  isFieldAllowed: PropTypes.bool,
  isFieldReadable: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  relationType: PropTypes.string.isRequired,
  targetModel: PropTypes.string.isRequired,
  queryInfos: PropTypes.exact({
    containsKey: PropTypes.string.isRequired,
    defaultParams: PropTypes.object,
    endPoint: PropTypes.string.isRequired,
    shouldDisplayRelationLink: PropTypes.bool.isRequired,
  }).isRequired,
};

const Memoized = memo(SelectWrapper);

export default connect(Memoized, select);
