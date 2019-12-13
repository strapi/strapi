import styled from 'styled-components';

const Card = styled.div`
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  max-width: calc(100% - 18px);

  > span {
    white-space: nowrap;
    color: #9ea7b8;
    font-size: 1.2rem;
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
