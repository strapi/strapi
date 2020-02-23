import styled from 'styled-components';

const FiltersListItem = styled.div`
  display: flex;
  align-items: center;
  height: 32px;
  margin-bottom: 4px;
  background: rgba(0, 126, 255, 0.08);
  border: 1px solid rgba(0, 126, 255, 0.24);
  border-radius: 2px;
  color: #007eff;
  font-size: 13px;
  span {
    padding-left: 15px;
    padding-right: 15px;
    line-height: 30px;
  }
  button {
    display: flex;
    justify-items: center;
    height: 13px;
    padding-left: 10px;
    padding-right: 10px;
    border-left: 2px solid rgba(0, 126, 255, 0.1);
  }
`;

export default FiltersListItem;
