import styled from 'styled-components';

const LogoContainer = styled.div`
  width: 70px;
  height: 36px;
  position: relative;
  margin: 0;
  text-align: center;
  background: #fafafb;
  border: 1px solid #f3f3f7;
  border-radius: 3px;
  font-size: 20px;

  > img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
  }

  .icon-wrapper {
    display: flex;
    align-items: center;
    height: 100%;
    flex-direction: column;
    justify-content: space-around;
  }
`;

export default LogoContainer;
