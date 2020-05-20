import styled from 'styled-components';

const Wrapper = styled.div`
  height: 68px;
  width: 100%;
  display: flex;
  margin-bottom: 4px;
  &:before {
    content: '';
    width: 5px;
    height: 100%;
    margin-right: 16px;
    background-color: #6dbb1a;
    border-top-left-radius: ${({ theme }) => theme.main.sizes.borderRadius};
    border-bottom-left-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  }
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  .icon-duplicate {
    margin-left: 10px;
    cursor: pointer;
  }
`;

export default Wrapper;
