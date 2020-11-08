import styled from 'styled-components';

const ToggleModeWrapper = styled.div`
  margin-left: auto;
  padding-right: 15px;
  padding-top: 8px;

  .toggleModeButton {
    height: 32px;
    min-width: 32px;
    padding-left: 10px;
    padding-right: 10px;
    border: 1px solid rgba(16, 22, 34, 0.1);
    border-radius: 3px;
    background: #f3f4f4;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    cursor: pointer;
    &:focus,
    &:active {
      outline: 0;
    }
  }
`;

export default ToggleModeWrapper;
