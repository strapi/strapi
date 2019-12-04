import styled from 'styled-components';

const DynamicZoneWrapper = styled.div`
  position: relative;
  padding-top: 10px;
  margin-bottom: 15px;
  & + & {
    padding-top: 13px;
  }
`;

export default DynamicZoneWrapper;
