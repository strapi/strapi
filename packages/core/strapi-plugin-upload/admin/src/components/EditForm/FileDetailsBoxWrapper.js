import styled from 'styled-components';
import { themePropTypes } from 'strapi-helper-plugin';

const FileDetailsBoxWrapper = styled.div`
  width: 100%;
  min-height: 119px;
  padding: 16px;
  background-color: ${({ theme }) => theme.main.colors.lightGrey};
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius};
`;

FileDetailsBoxWrapper.propTypes = themePropTypes;

export default FileDetailsBoxWrapper;
