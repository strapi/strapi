import styled from 'styled-components';

const ImgWrapper = styled.div`
  width: 19px;
  height: 19px;
  margin: auto;
  margin-right: 19px;
  border-radius: 50%;
  background-color: ${({ hasErrors, isOpen }) => {
    if (hasErrors) {
      return '#FAA684';
    } else if (isOpen) {
      return '#AED4FB';
    } else {
      return '#F3F4F4';
    }
  }}
  text-align: center;
  line-height: 19px;

  ${({ isOpen }) => !isOpen && 'transform: rotate(180deg)'}
`;

export default ImgWrapper;
