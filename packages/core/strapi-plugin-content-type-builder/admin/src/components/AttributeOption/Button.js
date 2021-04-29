import styled from 'styled-components';

const Button = styled.button`
  display: flex;
  width: 100% !important;
  height: 4rem;
  padding: 0 1rem 0 1rem;
  margin-top: 0.6rem;
  margin-bottom: 0.8rem;
  align-items: center;
  justify-content: space-between;
  border-radius: 0.25rem;
  border: 1px solid #e3e9f3;
  background: #ffffff;
  line-height: 4rem;
  box-shadow: 1px 1px 1px rgba(104, 118, 145, 0.05);
  cursor: pointer;

  &:hover,
  &:active,
  &:focus {
    background: #e6f0fb;
    border-color: #aed4fb;
    outline: 0;

    .attributeIcon {
      background-color: #007eff;

      > svg {
        g {
          path {
            fill: #007eff;
          }
        }
      }
    }
  }

  .attributeType {
    margin-right: 1.2rem;
    color: #323740;
    text-transform: capitalize;
    font-size: 1.3rem;
    font-weight: 500;
    font-style: normal;
    -webkit-font-smoothing: subpixel-antialiased;
  }
`;

export default Button;
