/**
 *
 * StyledLeftMenu
 *
 */

import styled from 'styled-components';

import sizes from '../../assets/styles/sizes';

// Specific colors for left menu
const colors = {
  black: '#2D3138',
  grey: '#666B74',
  mediumGrey: '#f2f3f4',
  lightGrey: '#E9EAEB',
};

const StyledLeftMenu = styled.div`
  width: 100%;
  min-height: calc(100vh - ${sizes.header.height});
  background-color: ${colors.mediumGrey};
  padding-top: 0.5rem;
  padding-left: 2rem;
  padding-right: 2rem;
  h3 {
    margin: 0;
    padding-left: 1rem;
    line-height: 1.3rem;
    color: #919bae;
    letter-spacing: 0.1rem;
    font-family: Lato;
    font-size: 1.1rem;
    font-weight: bold;
    text-transform: uppercase;
  }
  section {
    margin-top: 3.2rem;
    font-size: 1.3rem;
    ul.menu-list {
      margin-top: 1.1rem;
      padding: 0;
      font-size: 1.3rem;
      list-style-type: none;
      li {
        margin-bottom: 0.2rem;
      }
      button,
      a {
        padding: 0.9rem 1rem;
        width: 100%;
        p {
          position: relative;
          display: flex;
          justify-content: space-between;
          line-height: 1.6rem;
          padding-left: ${sizes.margin * 2.2}px;
          margin-bottom: 0;
          span {
            font-style: italic;
            &:first-of-type {
              text-transform: capitalize;
              font-style: inherit;
            }
          }
          i {
            position: absolute;
            left: 0;
            margin-right: 1rem;
          }
        }
      }
      button {
        i {
          top: calc(50% - ${sizes.margin * 0.6}px);
        }
      }
      a {
        display: block;
        text-decoration: none;
        p {
          color: ${colors.black};
        }
        i {
          font-size: 11px;
          top: calc(50% - ${sizes.margin * 0.5}px);
          color: ${colors.grey};
        }
        &.active {
          background-color: ${colors.lightGrey};
          font-weight: 700;
          i {
            color: ${colors.black};
          }
        }
      }
    }
  }
`;

export default StyledLeftMenu;
