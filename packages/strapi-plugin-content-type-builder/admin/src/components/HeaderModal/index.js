/**
 *
 * HeaderModal
 *
 */

import styled from 'styled-components';

import { colors, sizes } from 'strapi-helper-plugin';

const HeaderModal = styled.div`
  color: ${colors.black};
  font-weight: bold;
  section {
    padding: 0 ${sizes.margin * 3}px;
    display: flex;
    &:first-of-type {
      background-color: ${colors.lightGrey};
      font-size: 1.3rem;
      height: 59px;
    }
    &:not(:first-of-type) {
      height: 65px;
      font-size: 1.8rem;
      justify-content: space-between;
      position: relative;
      hr {
        position: absolute;
        left: ${sizes.margin * 3}px;
        bottom: 0;
        width: calc(100% - ${sizes.margin * 6}px);
        height: 1px;
        background: ${colors.brightGrey};
        border: 0;
        margin: 0;
      }
      span {
        padding-top: 16px;
      }
      .settings-tabs {
        position: absolute;
        right: ${sizes.margin * 3}px;
        bottom: -${sizes.margin * 0.1}px;
      }
    }
  }
`;

export default HeaderModal;
