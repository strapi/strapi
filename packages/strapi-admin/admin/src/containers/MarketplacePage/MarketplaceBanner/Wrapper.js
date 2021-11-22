import styled from 'styled-components';

// TODO : To migrate with @strapi/parts
const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 2rem;
  border-radius: 4px;
  border-left: 4px solid ${({ theme }) => theme.main.colors.mediumBlue};
  box-shadow: 0 2px 4px ${({ theme }) => theme.main.colors.darkGrey};
  padding: 8px 16px;

  .bannerImage {
    margin-right: 1rem;
    width: 48px;
    height: 48px;
    margin-right: 16px;
  }

  .bannerLink {
    color: ${({ theme }) => theme.main.colors.mediumBlue};
    font-weight: ${({ theme }) => theme.main.fontWeights.bold};
    svg {
      margin-left: 4px;
    }
  }
`;

export default Wrapper;
