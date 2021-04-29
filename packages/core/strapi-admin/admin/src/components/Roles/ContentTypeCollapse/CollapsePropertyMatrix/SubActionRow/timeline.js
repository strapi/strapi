import styled from 'styled-components';

const LeftBorderTimeline = styled.div`
  border-left: ${({ isVisible }) => (isVisible ? '3px solid #a5d5ff' : '3px solid transparent')};
`;

const TopTimeline = styled.div`
  padding-top: 8px;
  width: 3px;
  background-color: #a5d5ff;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
`;

export { LeftBorderTimeline, TopTimeline };
