/**
 *
 * StyedListRowCollapse
 *
 */

import styled from 'styled-components';

import { colors } from 'strapi-helper-plugin';

const StyedListRowCollapse = styled.tr`
  background-color: transparent;
  p {
    margin-bottom: 0;
  }
  img {
    width: 35px;
  }
  button {
    cursor: pointer;
  }
  td {
    position: relative;
    width: 100%;
    p {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &:first-of-type {
      padding: 0;
      padding-left: 0;
      padding-right: 0;
    }
    table {
      tr {
        cursor: pointer;
        td {
          &:first-of-type {
            width: 35rem;
            padding-left: 3rem;
            img {
              width: 35px;
              height: 20px;
              position: absolute;
              top: calc(50% - 10px);
              left: 3rem;
            }
            p {
              font-weight: 500;
              text-transform: capitalize;
            }
            img + p {
              width: 30rem;
              padding-left: calc(3rem + 35px);
            }
          }
          &:last-of-type {
            padding-right: 120px;
            button {
              outline: 0;
            }
            .type-wrapper {
              display: flex;
              justify-content: space-between;
              button {
                padding: 0;
                span {
                  color: #007eff;
                }
              }
            }
            .btn-wrapper {
              display: flex;
              position: absolute;
              right: 0;
              top: 0;
              height: 100%;
              padding-right: 30px;
              i {
                margin: auto;
              }
            }
          }
        }
        &:hover {
          background-color: ${colors.grey};
        }
      }
    }
    .collapse-body {
      padding-left: 65px;
      padding-right: 30px;
      table {
        background-color: rgba(250, 250, 251, 0.3);
        position: relative;
        :before {
          content: '-';
          color: transparent;
          background-color: #fafafb;
          position: absolute;
          top: 0;
          left: 0;
          width: 10px;
          height: 100%;
        }
        tr {
          cursor: auto;
          td:first-of-type {
            img + p {
              width: 23.6rem;
            }
          }
          &:hover {
            background-color: transparent;
          }
          &:before {
            width: calc(100% - 30px);
          }
        }
      }
    }
  }
`;

export default StyedListRowCollapse;
