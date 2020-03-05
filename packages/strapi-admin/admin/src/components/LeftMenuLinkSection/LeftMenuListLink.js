import styled from 'styled-components';

const LeftMenuListLink = styled.div`
  box-sizing: border-box;
  min-height: 3.7rem;
  flex-shrink: 0;
  margin-bottom: 0.1rem;
  overflow: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  ${props =>
    props.shrink &&
    `
    flex-shrink: 1;
  `}
`;

export default LeftMenuListLink;
