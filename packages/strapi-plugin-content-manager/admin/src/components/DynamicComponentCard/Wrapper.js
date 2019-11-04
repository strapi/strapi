import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 90px;
  width: 139px !important;
  margin-right: 10px;
  padding: 20px 10px 5px 10px;
  background-color: #ffffff;
  color: #919bae;
  text-align: center;
  border-radius: 2px;
  cursor: pointer;

  .component-uid {
    width: 119px;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }

  .component-icon {
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 35px;
    height: 35px;
    align-self: center;
    border-radius: 50%;
    background-color: #e9eaeb;
    color: #b4b6ba;
  }

  &:hover {
    background-color: #e6f0fb;
    color: #007eff;

    .component-icon {
      background-color: #aed4fb;
      color: #007eff;
    }
  }
`;

export default Wrapper;
