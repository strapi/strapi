import styled from 'styled-components';

const Wrapper = styled.div`
  .container-fluid {
    padding: 18px 30px;
    > div:first-child {
      margin-bottom: 11px;
    }
  }

  .form-wrapper {
    padding-top: 18px;
  }

  .form-container {
    background: #ffffff;
    padding: 22px 28px 0px;
    border-radius: 2px;
    box-shadow: 0 2px 4px #e3e9f3;
  }

  form {
    padding-top: 2rem;
  }
`;

const Loader = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 260px;
  margin: auto;
`;

const Title = styled.div`
  font-size: 18px;
  line-height: 18px;
  font-weight: bold;
`;

const Separator = styled.div`
  margin-top: 15px;
  border-top: 1px solid #f6f6f6;
`;

export { Loader, Title, Separator, Wrapper };
