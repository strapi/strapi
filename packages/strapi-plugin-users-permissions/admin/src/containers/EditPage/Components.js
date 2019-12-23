import styled from 'styled-components';

import { sizes } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  * {
    box-sizing: border-box;
  }

  > .container-fluid {
    padding: 18px 30px;
    > div:first-child {
      margin-bottom: 7px;
      @media (min-width: ${sizes.desktop}) {
        margin-bottom: 11px;
      }
    }
  }

  .form-wrapper {
    padding-top: 21px;
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
  margin-top: 13px;
  border-top: 1px solid #f6f6f6;
`;

export { Loader, Title, Separator, Wrapper };
