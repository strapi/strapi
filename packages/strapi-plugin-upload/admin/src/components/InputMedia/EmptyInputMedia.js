import styled from 'styled-components';

const EmptyInputMedia = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
  background-color: ${({ theme }) => theme.main.colors.black};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`;

EmptyInputMedia.defaultProps = {
  disabled: false,
};

export default EmptyInputMedia;
