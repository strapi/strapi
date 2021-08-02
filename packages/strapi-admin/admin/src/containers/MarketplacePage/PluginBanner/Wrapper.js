import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 2rem;
  border-radius: 4px;
  border-left: 4px solid #317ff6;
  box-shadow: 0 2px 4px #e3e9f3;
  padding: 8px 16px;

  .bannerImage {
    margin-right: 1rem;
    width: 48px;
    height: 48px;
    margin-right: 16px;
  }

  .bannerLink {
    color: #317ff6;
    font-weight: 700;
    svg {
      margin-left: 4px;
    }
  }
`;

export default Wrapper;
