import React from 'react';
import { Flex, Padded, Text } from '@buffetjs/core';
import { LoadingIndicator, Row } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import BaselineAlignement from '../BaselineAlignement';
import Bloc from '../Bloc';

const FormBloc = ({ children, cta, isLoading, title, subtitle }) => (
  <Bloc>
    <BaselineAlignement top size={title ? '18px' : '22px'} />
    <Padded left right size="sm">
      {isLoading ? (
        <>
          <LoadingIndicator />
          <BaselineAlignement bottom size="22px" />
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
                  {cta}
                </Flex>
              </Padded>
              <BaselineAlignement top size="18px" />
            </>
          )}
          <Row>{children}</Row>
        </>
      )}
    </Padded>
  </Bloc>
);

FormBloc.defaultProps = {
  cta: null,
  isLoading: false,
  subtitle: null,
  title: null,
};

FormBloc.propTypes = {
  children: PropTypes.node.isRequired,
  cta: PropTypes.any,
  isLoading: PropTypes.bool,
  subtitle: PropTypes.string,
  title: PropTypes.string,
};

export default FormBloc;
