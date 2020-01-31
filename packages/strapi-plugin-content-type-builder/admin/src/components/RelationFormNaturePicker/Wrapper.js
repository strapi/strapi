import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const StyledRelationNaturePicker = styled.div`
  position: relative;
  width: 100%;
  .nature-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: fit-content;
    &::before {
      content: '';
      position: absolute;
      top: 2.2rem;
      height: 1px;
      width: 100%;
      background-color: ${colors.relations.border};
      z-index: 0;
    }
    .nature-buttons {
      position: relative;
      width: fit-content;
      display: block;
      margin: 0 auto;
      z-index: 1;
    }
    .nature-txt {
      padding: 0 1rem;
      font-size: 1.3rem;
      text-align: center;
      margin-top: 6px;
      margin-bottom: 2px;
      span {
        &:first-of-type,
        &:nth-of-type(3) {
          text-transform: capitalize;
        }
        &:nth-of-type(2) {
          color: ${colors.relations.border};
        }
      }
    }
    svg {
      margin: 0 1.5rem;
      cursor: pointer;
    }
  }
`;

export default StyledRelationNaturePicker;
