import React from 'react';
import { Padded, Text } from '@buffetjs/core';
import { LoadingIndicator, Row } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import BaselineAlignement from '../BaselineAlignement';
import Bloc from '../Bloc';

const FormBloc = ({ children, isLoading, title }) => (
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
                <Padded left right size="sm">
                  <Text fontSize="lg" fontWeight="bold">
                    {title}
                  </Text>
                </Padded>
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
  isLoading: false,
  title: null,
};

FormBloc.propTypes = {
  children: PropTypes.node.isRequired,
  isLoading: PropTypes.bool,
  title: PropTypes.string,
};

export default FormBloc;
