import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 114px;

  h1 {
    margin-bottom: 12px;
    text-shadow: 0 1rem 4rem rgba(255, 255, 255, 0.8);
    color: #2c3138;
    font-size: 6.4rem;
    letter-spacing: 2px;
  }

  h2 {
    margin-bottom: 50px;
    color: #2c3138;
    font-size: 1.4rem;
    font-weight: 400;
  }

  button {
    margin: 0;
  }
`;

export default Wrapper;
