import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { Text } from '@strapi/design-system/Text';
import { Flex } from '@strapi/design-system/Flex';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';

const AccordionFooter = styled(Box)`
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-left: 1px solid ${({ theme }) => theme.colors.neutral200};
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
`;

const EnhancedGroup = styled(Box)`
  > div {
    & > * {
      border-radius: unset;
      border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
      border-left: 1px solid ${({ theme }) => theme.colors.neutral200};
      border-bottom: 1px solid ${({ theme }) => theme.colors.neutral200};
    }
  }

  > div:first-of-type {
    > div {
      border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
    }

    > div:not([data-strapi-expanded='true']) {
      border-top: 1px solid ${({ theme }) => theme.colors.neutral200};

      &:hover {
        border-top: 1px solid ${({ theme }) => theme.colors.primary600};
      }
    }
  }

  & [data-strapi-expanded='true'] {
    border: 1px solid ${({ theme }) => theme.colors.primary600};
  }

  ${({ theme, footer }) => `
    &:not(${footer}) {
      & > *:last-of-type {
        border-radius: 0 0 ${theme.borderRadius} ${theme.borderRadius};
      }
    }
  `}
`;

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const AccordionGroupCustom = ({ children, footer, label, labelAction }) => {
  return (
    <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
      {label && (
        <Flex paddingBottom={1}>
          <Text as="label" textColor="neutral800" small bold>
            {label}
          </Text>
          {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
        </Flex>
      )}
      <EnhancedGroup footer={footer}>{children}</EnhancedGroup>
      {footer && <AccordionFooter>{footer}</AccordionFooter>}
    </KeyboardNavigable>
  )
};

AccordionGroupCustom.defaultProps = {
  footer: null,
  label: null,
  labelAction: undefined,
};

AccordionGroupCustom.propTypes = {
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  label: PropTypes.string,
  labelAction: PropTypes.node,
};

export default AccordionGroupCustom;
