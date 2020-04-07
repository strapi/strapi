import styled from 'styled-components';
import Bkg from '../../assets/images/background_input.svg';

const Wrapper = styled.div`
  margin-top: 1.6rem;
  > div {
    padding: 0;
  }

  .pageFooterLabel {
    margin-left: 1rem;
    padding-top: 1px;
    color: #787e8f;
    font-size: 13px;
    font-style: italic;
  }

  .pageFooterSelectWrapper {
    display: flex;

    > select {
      width: 75px !important;
      height: 3.2rem !important;
      padding-top: 0rem;
      padding-left: 1rem;
      padding-right: 3rem;
      background-position: right -1px center;
      background-repeat: no-repeat;
      background-image: url(${Bkg});
      border: 1px solid #e3e9f3;
      border-radius: 0.25rem;
      line-height: 29px;
      font-size: 1.3rem;
      font-family: 'Lato' !important;
      -moz-appearance: none;
      -webkit-appearance: none;
    }
  }
`;

export default Wrapper;
