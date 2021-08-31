/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Collapse } from 'reactstrap';

const ToggleUl = styled(Collapse)`
  font-size: 13px;
  padding: 12px 15px 0 15px;
  list-style: none;
  background-color: #fff;
  > li {
    padding-top: 5px;
    label {
      cursor: pointer;
    }

    .check-wrapper {
      z-index: 9;
      > input {
        z-index: 1;
      }
    }
  }
  > li:not(:last-child) {
    padding-bottom: 12px;
  }
`;

const SubUl = ({ children, isOpen }) => {
  return (
    <ToggleUl tag="ul" isOpen={isOpen}>
      {children}
    </ToggleUl>
  );
};

SubUl.defaultProps = {
  children: null,
  isOpen: false,
};

SubUl.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool,
};

export default SubUl;
