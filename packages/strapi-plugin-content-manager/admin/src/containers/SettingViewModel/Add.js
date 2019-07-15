import React from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import {
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';

const Wrapper = styled.div`
  margin-left: 29px;
  > div {
    height: 30px;
    width: 100%;
    justify-content: space-between;
    background: #ffffff;
    color: #333740;
    border: 1px solid #e3e9f3;
    border-radius: 2px;
    > button {
      position: relative;
      cursor: pointer;
      padding-left: 10px !important;
      line-height: 30px;
      width: 100%;
      color: #333740;
      text-align: left;
      background-color: #ffffff;
      border: none;
      font-size: 13px;
      font-weight: 500;
      &:focus,
      &:active,
      &:hover,
      &:visited {
        background-color: transparent !important;
        box-shadow: none;
        color: #333740;
      }
      > p {
        height: 100%;
        margin-left: 20px;
        margin-bottom: 0;
        margin-top: -1px;
        color: #007eff !important;
        font-size: 13px !important;
      }
      &:before {
        position: absolute;
        top: 0px;
        bottom: 0;
        content: '\f067';
        font-family: FontAwesome;
        font-size: 10px;
        color: #007eff;
      }
    }
    > div {
      max-height: 180px;
      min-width: calc(100% + 2px);
      margin-left: -1px;
      margin-top: -1px;
      padding: 0;
      border-top-left-radius: 0 !important;
      border-top-right-radius: 0;
      border-color: #e3e9f3 !important;
      border-top-color: #aed4fb !important;
      box-shadow: 0 2px 3px rgba(227, 233, 245, 0.5);

      overflow: scroll;

      button {
        height: 30px;
        padding-left: 10px !important;
        line-height: 26px;
        cursor: pointer;
        font-size: 13px !important;
        &:hover {
          background-color: #fafafb !important;
        }
        div {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

  ${({ isOpen }) => {
    if (isOpen) {
      return css`
        > div {
          background-color: #e6f0fb !important;
          border-color: #aed4fb !important;
        }
      `;
    }
  }}

  ${({ notAllowed }) => {
    if (notAllowed) {
      return css`
        > div {
          > button {
            cursor: not-allowed !important;
          }
        }
      `;
    }
  }}
`;

function Add({ data, onClick }) {
  const [state, setState] = React.useState(false);

  return (
    <Wrapper isOpen={state} notAllowed={data.length === 0}>
      <ButtonDropdown
        isOpen={state}
        toggle={() => {
          if (data.length > 0) {
            setState(prevState => !prevState);
          }
        }}
      >
        <DropdownToggle>
          <FormattedMessage id="content-manager.containers.SettingPage.addField">
            {msg => <p>{msg}</p>}
          </FormattedMessage>
        </DropdownToggle>
        <DropdownMenu>
          {data.map(item => (
            <DropdownItem
              key={item}
              onClick={() => {
                onClick(item);
              }}
            >
              {item}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </ButtonDropdown>
    </Wrapper>
  );
}

Add.defaultProps = {
  data: [],
  onClick: () => {},
};

Add.propTypes = {
  data: PropTypes.array,
  onClick: PropTypes.func,
};

export default Add;
