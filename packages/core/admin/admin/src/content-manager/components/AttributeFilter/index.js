import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Picker, Select } from '@buffetjs/core';
import {
  FilterIcon,
  getFilterType as comparatorsForType,
  useTracking,
  useQueryParams,
} from '@strapi/helper-plugin';
import { FormattedMessage } from 'react-intl';
import useAllowedAttributes from './hooks/useAllowedAttributes';
import getTrad from '../../utils/getTrad';
import formatAttribute from './utils/formatAttribute';
import getAttributeType from './utils/getAttributeType';
import GenericInput from './GenericInput';
import { StyledButton, FormWrapper } from './components';

const AttributeFilter = ({ contentType, slug, metaData }) => {
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams();

  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const [attribute, setAttribute] = useState(allowedAttributes[0]);

  const attributeType = getAttributeType(attribute, contentType, metaData);
  const comparators = comparatorsForType(attributeType);
  const [comparator, setComparator] = useState(comparators[0].value);

  const [value, setValue] = useState();

  return (
    <Picker
      renderButtonContent={() => (
        <>
          <FilterIcon />
          <FormattedMessage id="app.utils.filters" />
        </>
      )}
      renderSectionContent={onToggle => {
        const handleSubmit = e => {
          e.preventDefault();

          const formattedAttribute = formatAttribute(attribute, metaData);

          /**
           * When dealing with a "=" comparator, the filter should have a shape of {'attributeName': 'some value}
           * otherwise, it should look like { 'attributeName_comparatorName' : 'some value' }
           */
          const newFilter =
            comparator === '='
              ? { [formattedAttribute]: value }
              : { [`${formattedAttribute}${comparator}`]: value };

          /**
           * Pushing the filter in the URL for later refreshes or fast access
           */
          const actualQuery = query || {};
          const _where = actualQuery._where || [];
          _where.push(newFilter);
          setQuery({ ...actualQuery, _where, page: 1 });

          /**
           * Tracking stuff
           */
          const useRelation = _where.some(obj => Object.keys(obj)[0].includes('.'));
          trackUsage('didFilterEntries', { useRelation });

          /**
           * Reset to initial state
           */
          setAttribute(allowedAttributes[0]);
          setComparator(comparators[0].value);
          setValue(undefined);

          onToggle();
        };

        return (
          <FormWrapper onSubmit={handleSubmit}>
            <Select
              onChange={e => setAttribute(e.target.value)}
              name="ct-filter"
              options={allowedAttributes}
              value={attribute}
            />
            <Select
              onChange={e => setComparator(e.target.value)}
              name="comparator"
              value={comparator}
              options={comparators.map(comparator => (
                <FormattedMessage id={comparator.id} key={comparator.value}>
                  {msg => <option value={comparator.value}>{msg}</option>}
                </FormattedMessage>
              ))}
            />
            <GenericInput name="input" onChange={setValue} type={attributeType} value={value} />
            <StyledButton icon type="submit">
              <FormattedMessage
                id={getTrad('components.FiltersPickWrapper.PluginHeader.actions.apply')}
              />
            </StyledButton>
          </FormWrapper>
        );
      }}
    />
  );
};

AttributeFilter.propTypes = {
  contentType: PropTypes.object.isRequired,
  metaData: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
};

export default AttributeFilter;
