import styled from 'styled-components';

const Wrapper = styled.div`
  padding-top: 18px;
  border: 1px solid ${({ theme }) => theme.main.colors.darkBlue};
  border-top: none;
  border-bottom: ${({ isLast, theme }) => {
    if (isLast) {
      return `1px solid ${theme.main.colors.darkBlue}`;
    }

    return `none`;
  }};
  border-radius: 0px 0px 2px 2px;
`;

Wrapper.defaultProps = {
  isLast: true,
};

export default Wrapper;
