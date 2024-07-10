import { Box, IconButton, TextInput, Typography } from '@strapi/design-system';
import { ChevronRight } from '@strapi/icons';
import styled from 'styled-components';

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const KapaPrompt = () => {
  return (
    <Box>
      <Box paddingTop={6} paddingBottom={4}>
        <Typography variant="pi">
          Disclaimer: Answers are AI-generated and might be inaccurate. Please ensure you
          double-check the information provided by visiting source pages.
        </Typography>
      </Box>
      <TextInput
        label=" "
        placeholder="Ask me a question about the Media Library..."
        endAction={
          <IconButtonCustom noBorder onClick={() => {}} aria-label="send">
            <ChevronRight />
          </IconButtonCustom>
        }
      />
    </Box>
  );
};

export { KapaPrompt };
