/**
 *
 * AttributeOption
 *
 */

import React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import useFormModalNavigation from '../../../hooks/useFormModalNavigation';
import getTrad from '../../../utils/getTrad';
import AttributeIcon from '../../AttributeIcon';
import OptionBoxWrapper from '../OptionBoxWrapper';

// TODO: Remove after the RTE Blocks Alpha release
const AlphaTag = styled(Box)`
  background-color: ${({ theme }) => theme.colors.warning100};
  border: ${({ theme }) => `1px solid ${theme.colors.warning200}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes[0]};
  padding: ${({ theme }) => `${2 / 16}rem ${theme.spaces[1]}`};
`;

const AttributeOption = ({ type }) => {
  const { formatMessage } = useIntl();

  const { onClickSelectField } = useFormModalNavigation();

  const handleClick = () => {
    const step = type === 'component' ? '1' : null;

    onClickSelectField({
      attributeType: type,
      step,
    });
  };

  // TODO: Remove after the RTE Blocks Alpha release
  const alphaTagStylesWidth = type === 'blocks' && { width: '100%' };
  const alphaTagStylesJustifyContent = type === 'blocks' && { justifyContent: 'space-between' };

  return (
    <OptionBoxWrapper padding={4} as="button" hasRadius type="button" onClick={handleClick}>
      <Flex>
        <AttributeIcon type={type} />
        <Box paddingLeft={4} {...alphaTagStylesWidth}>
          <Flex {...alphaTagStylesJustifyContent}>
            <Typography fontWeight="bold">
              {formatMessage({ id: getTrad(`attribute.${type}`), defaultMessage: type })}
            </Typography>
            {/* Remove after the RTE Blocks Alpha release */}
            {type === 'blocks' && (
              <AlphaTag>
                <Typography fontSize="0" textColor="warning600" fontWeight="bold">
                  ALPHA
                </Typography>
              </AlphaTag>
            )}
          </Flex>

          <Flex>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: getTrad(`attribute.${type}.description`),
                defaultMessage: 'A type for modeling data',
              })}
            </Typography>
          </Flex>
        </Box>
      </Flex>
    </OptionBoxWrapper>
  );
};

AttributeOption.defaultProps = {
  type: 'text',
};

AttributeOption.propTypes = {
  type: PropTypes.string,
};

export default AttributeOption;
