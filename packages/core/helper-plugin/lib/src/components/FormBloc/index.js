import React from 'react';
import { Flex, Padded, Text } from '@buffetjs/core';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import LoadingIndicator from '../LoadingIndicator';
import Row from '../Row';

const BaselineAlignment = styled.div`
  padding-top: ${({ size, top }) => top && size};
  padding-right: ${({ size, right }) => right && size};
  padding-bottom: ${({ size, bottom }) => bottom && size};
  padding-left: ${({ size, left }) => left && size};
`;
const Bloc = styled.div`
  background: ${({ theme }) => theme.main.colors.white};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: 0 2px 4px #e3e9f3;
`;

const FormBloc = ({ children, actions, isLoading, title, subtitle }) => (
  <Bloc>
    <BaselineAlignment top size={title ? '18px' : '22px'} />
    <Padded left right size="sm">
      {isLoading ? (
        <>
          <LoadingIndicator />
          <BaselineAlignment bottom size="22px" />
        </>
      ) : (
        <>
          {title && (
            <>
              <Padded left right size="xs">
                <Flex justifyContent="space-between">
                  <Padded left right size="sm">
                    <Text fontSize="lg" fontWeight="bold">
                      {title}
                    </Text>
                    {subtitle && (
                      <Text color="grey" lineHeight="1.8rem">
                        {subtitle}
                      </Text>
                    )}
                  </Padded>
                  {actions}
                </Flex>
              </Padded>
              <BaselineAlignment top size="18px" />
            </>
          )}
          <Row>{children}</Row>
        </>
      )}
    </Padded>
  </Bloc>
);

FormBloc.defaultProps = {
  actions: null,
  isLoading: false,
  subtitle: null,
  title: null,
};

FormBloc.propTypes = {
  actions: PropTypes.any,
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
  subtitle: PropTypes.string,
  title: PropTypes.string,
};

export default FormBloc;
