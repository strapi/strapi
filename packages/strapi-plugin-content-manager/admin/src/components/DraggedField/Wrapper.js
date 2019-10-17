import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  height: 30px;
  padding: 0 10px 0 0;
  margin-right: 4px;
  flex-basis: calc(100% / ${props => props.count});
  flex-shrink: 1;
  min-width: 130px;
  position: relative;

  .sub_wrapper {
    position: relative;
    height: 30px;
    line-height: 30px;
    background: #fafafb;
    border: 1px solid #e3e9f3;
    border-radius: 2px;
    .name {
      position: relative;
      padding-left: 38px;
      padding-right: 38px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }
    .grab {
      position: absolute;
      top: -1px;
      left: 0;
      margin-right: 10px;
      padding-left: 10px;
      border-right: 1px solid #e9eaeb;
      cursor: move;
      z-index: 99;
    }

    .remove {
      width: 30px;
      text-align: center;
      background-color: #e9eaeb;
      cursor: pointer;

      position: absolute;
      top: -1px;
      right: 0;

      svg {
        align-self: center;
      }
    }
  }
`;

Wrapper.defaultProps = {
  count: 1,
};

Wrapper.propTypes = {
  count: PropTypes.number,
};

export default Wrapper;
