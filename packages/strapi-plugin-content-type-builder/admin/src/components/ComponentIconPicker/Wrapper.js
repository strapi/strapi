import styled from 'styled-components';

const Wrapper = styled.div`
  min-height: 199px;
  margin-top: -2px;

  .collection {
    background-color: #fafafb;
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
