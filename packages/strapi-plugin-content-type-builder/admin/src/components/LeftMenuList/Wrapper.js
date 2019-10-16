import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const Wrapper = styled.div`
  margin-bottom: 33px;
  .list-header {
    color: ${colors.leftMenu.darkGrey};
    button {
      position: relative;
      outline: 0;
      padding: 0;
      &::before {
        content: '\f106';
        position: absolute;
        left: 0;
        top: 0px;
        font-family: 'FontAwesome';
        font-size: 15px;
      }
    }
    h3 {
      margin: 0;
      line-height: 1.3rem;
      letter-spacing: 0.1rem;
      font-family: Lato;
      font-size: 1.1rem;
      font-weight: bold;
      text-transform: uppercase;
      padding-left: 1.6rem;
      span {
        margin-top: 2px;
        padding: 1px 3px;
        height: 14px;
        min-width: 14px;
        display: inline-block;
        background-color: ${colors.leftMenu.lightGrey};
        text-align: center;
      }
    }
  }

  &.list-collapsed {
    .list-header {
      button::before {
        content: '\f107';
      }
    }
  }
`;

export default Wrapper;
