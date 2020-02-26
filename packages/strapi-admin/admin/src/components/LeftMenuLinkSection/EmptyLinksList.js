import styled from 'styled-components';

const EmptyLinksList = styled.div`
  color: ${props => props.theme.main.colors.white};
  padding-left: 1.6rem;
  padding-right: 1.6rem;
  font-weight: 300;
  min-height: 3.6rem;
  padding-top: 0.6rem;
`;

EmptyLinksList.defaultProps = {
  theme: {
    main: {
      colors: {
        white: '#ffffff',
      },
    },
  },
};

export default EmptyLinksList;
