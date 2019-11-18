import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  height: 90px;
  width: 139px !important;
  margin-right: 10px;
  padding: 18px 10px 15px 10px;
  background-color: #ffffff;
  color: #919bae;
  text-align: center;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #ffffff;

  .component-uid {
    width: 119px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    color: #919bae;
    font-weight: 500;
    font-size: 13px;
    line-height: normal;
  }

  .component-icon {
    width: 35px;
    height: 35px;
    margin-bottom: 11px;
    line-height: 35px;
    align-self: center;
    border-radius: 50%;
    background-color: #e9eaeb;
    color: #b4b6ba;
    i {
      margin: auto;
      display: block;
    }
  }

  &:hover {
    background-color: #e6f0fb;
    color: #007eff;
    border: 1px solid #aed4fb;

    .component-icon {
      background-color: #aed4fb;
      color: #007eff;
    }
    .component-uid {
      color: #007eff;
    }
  }
`;

export default Wrapper;
