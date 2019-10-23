import styled from 'styled-components';

const RelationBoxWrapper = styled.div`
  .relationBox {
    display: inline-block;
    height: 13.8rem;
    width: 20rem;
    background-color: #fcfcfc;
    box-shadow: 0 1px 2px #cad2df;
    z-index: 9999;
    border-radius: 2px;
  }
  .relationBoxHeader {
    height: 3.6rem;
    width: 100%;
    padding-top: 0.1rem;
    background-color: rgba(16, 22, 34, 0.04);
    line-height: 3.6rem;
    text-align: center;
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: capitalize;
    > p {
      padding: 0 10px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      > i {
        margin-right: 8px;
      }
    }
  }
  .relationBoxBody {
    padding-top: 10px;
  }
`;

export default RelationBoxWrapper;
