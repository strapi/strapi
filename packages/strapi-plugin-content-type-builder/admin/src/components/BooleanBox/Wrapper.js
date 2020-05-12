import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  position: relative;
  margin-top: 8px;

  .option {
    border-radius: 2px;
    border: 1px solid transparent;
    background-color: #fafafb;
    will-change: transform, opacity;
    color: #9ea7b8;
    > p {
      max-width: calc(100% - 20px);
      margin-top: -1px;
      line-height: 18px;
    }
  }

  .option__title {
    font-size: 16px;
  }

  .option__indicator {
    display: block;
    will-change: transform;
    position: absolute;
    top: 36px;
    left: 20px;
    background: #ffffff;
    width: 12px;
    height: 12px;
    border: solid 1px #b4b6ba;
    border-radius: 50%;

    &:before,
    &:after {
      content: '';
      display: block;
      border-radius: 50%;
      width: 8px;
      height: 8px;
      position: absolute;
      top: 1px;
      left: 1px;
    }

    &:after {
      transform: scale(0);
      transition: inherit;
      will-change: transform;
    }
  }

  .option-input:nth-child(1):checked ~ .option:nth-of-type(1),
  .option-input:nth-child(2):checked ~ .option:nth-of-type(2) {
    background-color: #e6f0fb;
    border: 1px solid #aed4fb;
    color: #007eff;
    .option__indicator {
      border: solid 1px #aed4fb;
      &::after {
        background: #007eff;

        transform: scale(1);
      }
    }
  }
`;

export default Wrapper;
