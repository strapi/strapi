import React, { Children, cloneElement } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import { Box, Typography, Flex, KeyboardNavigable } from '@strapi/design-system';

const AccordionFooter = styled(Box)`
  overflow: hidden;
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
    > div {
      > div:first-of-type {
        border-radius: unset;
      }
    }
  }

  > div:first-of-type {
    > div {
      border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
      > div:first-of-type {
        border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
      }
    }

    > div:not([data-strapi-expanded='true']) {
      border-top: 1px solid ${({ theme }) => theme.colors.neutral200};

      &:hover {
        border-top: 1px solid ${({ theme }) => theme.colors.primary600};
      }
    }

    > span {
      border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
      border-top: 1px solid ${({ theme }) => theme.colors.neutral200};
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

const AccordionGroupCustom = ({ children, footer, label, labelAction, error }) => {
  const { formatMessage } = useIntl();
  const childrenArray = Children.toArray(children).map((child) => {
    return cloneElement(child, { hasErrorMessage: false });
  });

  return (
    <KeyboardNavigable attributeName="data-strapi-accordion-toggle">
      {label && (
        <Flex paddingBottom={1}>
          <Typography as="label" textColor="neutral800" variant="pi" fontWeight="bold">
            {label}
          </Typography>
          {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
        </Flex>
      )}
      <EnhancedGroup footer={footer}>{childrenArray}</EnhancedGroup>
      {footer && <AccordionFooter>{footer}</AccordionFooter>}
      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600">
            {formatMessage({ id: error.id, defaultMessage: error.id }, { ...error.values })}
          </Typography>
        </Box>
      )}
    </KeyboardNavigable>
  );
};

AccordionGroupCustom.defaultProps = {
  error: undefined,
  footer: null,
  label: null,
  labelAction: undefined,
};

AccordionGroupCustom.propTypes = {
  children: PropTypes.node.isRequired,
  error: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  footer: PropTypes.node,
  label: PropTypes.string,
  labelAction: PropTypes.node,
};

export default AccordionGroupCustom;
