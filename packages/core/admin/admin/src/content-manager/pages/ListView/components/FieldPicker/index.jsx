import React from 'react';

import { Flex, BaseCheckbox, TextButton, Typography } from '@strapi/design-system';
import { useCollator, useTracking } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { checkIfAttributeIsDisplayable } from '../../../../utils';
import { onChangeListHeaders, onResetListHeaders } from '../../actions';
import { selectDisplayedHeaders } from '../../selectors';

const ChackboxWrapper = styled(Flex)`
  :hover {
    background-color: ${(props) => props.theme.colors.primary100};
  }
`;

export const FieldPicker = ({ layout }) => {
  const dispatch = useDispatch();
  const displayedHeaders = useSelector(selectDisplayedHeaders);
  const { trackUsage } = useTracking();
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const columns = Object.keys(layout.contentType.attributes)
    .filter((name) => checkIfAttributeIsDisplayable(layout.contentType.attributes[name]))
    .map((name) => ({
      name,
      label: layout.contentType.metadatas[name].list.label,
    }))
    .sort((a, b) => formatter.compare(a.label, b.label));

  const displayedHeaderKeys = displayedHeaders.map(({ name }) => name);

  const handleChange = (name) => {
    trackUsage('didChangeDisplayedFields');
    dispatch(onChangeListHeaders({ name, value: displayedHeaderKeys.includes(name) }));
  };

  const handleReset = () => {
    dispatch(onResetListHeaders());
  };

  return (
    <Flex as="fieldset" direction="column" alignItems="stretch" gap={3}>
      <Flex justifyContent="space-between">
        <Typography as="legend" variant="pi" fontWeight="bold">
          {formatMessage({
            id: 'containers.ListPage.displayedFields',
            defaultMessage: 'Displayed fields',
          })}
        </Typography>

        <TextButton onClick={handleReset}>
          {formatMessage({
            id: 'app.components.Button.reset',
            defaultMessage: 'Reset',
          })}
        </TextButton>
      </Flex>

      <Flex direction="column" alignItems="stretch">
        {columns.map((header) => {
          const isActive = displayedHeaderKeys.includes(header.name);

          return (
            <ChackboxWrapper
              wrap="wrap"
              gap={2}
              as="label"
              background={isActive ? 'primary100' : 'transparent'}
              hasRadius
              padding={2}
              key={header.name}
            >
              <BaseCheckbox
                onChange={() => handleChange(header.name)}
                value={isActive}
                name={header.name}
              />
              <Typography fontSize={1}>{header.label}</Typography>
            </ChackboxWrapper>
          );
        })}
      </Flex>
    </Flex>
  );
};

FieldPicker.propTypes = {
  layout: PropTypes.shape({
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
};
