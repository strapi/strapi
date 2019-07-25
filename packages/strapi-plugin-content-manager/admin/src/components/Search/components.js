import styled from 'styled-components';
import Cross from '../../assets/images/icon-cross.svg';
import Search from '../../assets/images/icon-search.svg';

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  min-width: 44rem;
  height: 6rem;
  padding-right: 20px;
  background-color: #ffffff;
  border-right: 1px solid #f3f4f4;
  z-index: 1050;
  color: #9ea7b8;
  line-height: 6rem;
  letter-spacing: 0;

  &:before {
    content: '';
    width: 16px;
    height: 16px;
    background-image: url(${Search});
    margin-right: 10px;
    color: #b3b5b9;
    vertical-align: middle;
  }

  input {
    position: relative;
    width: 100%;
    outline: 0;

    &::placeholder {
      color: #9ea7b8 !important;
      font-size: 13px !important;
    }
  }

  > div:first-child {
    display: flex;
    flex: 2;
  }
`;

const Infos = styled.div`
  position: relative;
  height: 22px;
  margin: auto;
  margin-top: 19px;
  margin-left: 20px;
  padding-right: 10px;
  padding-left: 30px;
  background: rgba(0, 126, 255, 0.08);
  border: 1px solid rgba(0, 126, 255, 0.24);
  border-radius: 2px;
  line-height: 22px;
  color: #007eff;
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
  > img {
    position: absolute;
    top: 1px;
    margin: auto;
    bottom: 0;
    left: 11px;
    height: 7px;
  }
`;

const Clear = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 13px;
  height: 13px;
  margin: 25px auto 0;
  border-radius: 50%;
  cursor: pointer;

  &:after {
    content: '';
    width: 8px;
    height: 8px;
    margin: auto;
    background-image: url(${Cross});
  }
`;

export { Clear, Wrapper, Infos };
