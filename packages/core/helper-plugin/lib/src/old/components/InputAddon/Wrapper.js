import styled from 'styled-components';

const Wrapper = styled.div`
  min-width: 200px;
  margin-bottom: 1rem;
  font-size: 1.3rem;

  > input {
    height: 3.4rem;
    margin-top: 0.9rem;
    padding-left: 1rem;
    background-size: 0 !important;
    border: 1px solid #e3e9f3;
    border-left: 0;
    border-radius: 0.25rem;
    line-height: 3.4rem;
    font-size: 1.3rem;
    font-family: 'Lato' !important;
    box-shadow: 0px 1px 1px rgba(104, 118, 142, 0.05);
    &:focus {
      border-color: #78caff;
    }
  }

  & + span {
    border-color: #e3e9f3;
  }

  .addon {
    min-width: 5.9rem;
    height: 3.4rem;
    margin-top: 0.9rem;
    background-color: rgba(16, 22, 34, 0.02);
    border: 1px solid #e3e9f3;
    border-right: 0;
    border-radius: 0.25rem;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    color: rgba(16, 22, 34, 0.5);
    line-height: 3.2rem;
    font-size: 1.3rem;
    font-family: 'Lato';
    font-weight: 600 !important;
    -moz-appearance: none;
    -webkit-appearance: none;
  }

  .addonFocus {
    border-color: #78caff;
    border-right: 0;
  }

  .errorAddon {
    border: 1px solid #ff203c !important;
    border-right: none !important;
  }

  .invalidAddon {
    border-color: #ff203c !important;
    border-left: 0;
  }
`;

export default Wrapper;
