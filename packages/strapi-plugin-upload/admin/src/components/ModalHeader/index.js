/*
 * NOTE:
 * This component should be put in the strapi-helper-plugin
 * at some point so the other packages can benefits from the updates
 *
 *
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { HeaderModalTitle } from 'strapi-helper-plugin';
import ModalSection from '../ModalSection';
import Wrapper from './Wrapper';

const ModalHeader = ({ headers }) => {
  return (
    <Wrapper>
      <ModalSection>
        <HeaderModalTitle>
          {headers.map(({ key, element }) => {
            return <Fragment key={key}>{element}</Fragment>;
          })}
        </HeaderModalTitle>
      </ModalSection>
    </Wrapper>
  );
};

ModalHeader.defaultProps = {
  headers: [],
};

ModalHeader.propTypes = {
  headers: PropTypes.array,
};

export default ModalHeader;
