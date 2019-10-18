import styled from 'styled-components';

const Card = styled.div`
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  max-width: calc(100% - 18px);

  &:after {
    content: '\f05d';
    position: absolute;
    top: 7px;
    right: 26px;
    color: #e3e9f3;
    font-size: 1.4rem;
    font-family: 'FontAwesome';
    -webkit-font-smoothing: antialiased;
  }

  &:hover {
    background: none;
  }

  > img {
    display: inline-block;
    height: 20px;
    width: 35px;
    margin-right: 10px;
  }

  > span {
    white-space: nowrap;
    color: #9ea7b8;
    font-size: 1.2rem;
    font-style: italic;
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    margin-top: auto;
    margin-bottom: auto;
    line-height: normal;

    &:last-child {
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
`;

export default Card;
