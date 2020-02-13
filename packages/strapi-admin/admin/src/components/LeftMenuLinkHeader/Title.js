import styled from 'styled-components';

const Title = styled.div`
  display: flex;
  justify-content: space-between;
  padding-left: 2rem;
  padding-right: 1.6rem;
  padding-top: 0.7rem;
  margin-bottom: 0.8rem;
  color: ${props => props.theme.main.colors.leftMenu['title-color']};
  text-transform: uppercase;
  font-size: 1.1rem;
  letter-spacing: 0.1rem;
  font-weight: 800;
`;

Title.defaultProps = {
  theme: {
    main: {
      colors: {
        leftMenu: {
          'title-color': '#5b626f',
        },
      },
    },
  },
};

export default Title;
