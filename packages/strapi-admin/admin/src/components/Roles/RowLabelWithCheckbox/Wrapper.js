import styled from 'styled-components';

import PropTypes from 'prop-types';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  width: ${({ width }) => width};
  ${({ disabled, theme }) =>
    disabled &&
    `
    input[type='checkbox'] {
    cursor: not-allowed;
      &:after {
        color: ${theme.main.colors.grey};
      }
    }
  `}
`;

Wrapper.defaultProps = {
  width: '18rem',
};

Wrapper.propTypes = {
  width: PropTypes.string,
};

export default Wrapper;
