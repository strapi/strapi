import styled from 'styled-components';

const Wrapper = styled.div`
  height: 150px;
  margin-top: -1px;

  .collection {
    background-color: #fff;
  }

  .cell {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 0.25rem;
    // color: #fff;
    color: black;
  }

  .noCells {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1em;
    color: #bdbdbd;
  }
`;

export default Wrapper;
