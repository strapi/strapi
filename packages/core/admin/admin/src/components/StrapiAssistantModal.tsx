import {
  Flex,
  Icon,
  IconButton,
  ModalBody,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { ExternalLink, Book } from '@strapi/icons';
import styled from 'styled-components';

import StrapiLogo from '../assets/images/logo-strapi-2022.svg';

import { KapaPrompt } from './KapaPrompt';

const Preview = styled.img`
  width: ${({ theme }) => theme.spaces[8]};
  height: ${({ theme }) => theme.spaces[8]};
  /* Same overlay used in ModalLayout */
  border-radius: ${({ theme }) => theme.borderRadius};
`;

interface StrapiAssistantModal {
  onClose: () => void;
}

const StrapiAssistantModal = ({ onClose }: StrapiAssistantModal) => {
  return (
    <ModalLayout labelledBy="title" onClose={onClose}>
      <ModalHeader>
        <Flex gap={4}>
          <Preview src={StrapiLogo} alt="" />
          <Typography variant="beta" fontWeight="semiBold">
            Strapi Media library AI assistant
          </Typography>
        </Flex>
      </ModalHeader>
      <ModalBody>
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" fontWeight="bold">
            Looking for the Media library documentation?
          </Typography>
          <a
            href="https://docs.strapi.io/user-docs/media-library"
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Flex borderColor="neutral150" gap={2} padding={4}>
              <Icon as={Book} width={8} height={8} />
              <Typography>
                Introduction to the Media Library which allows to display and manage all assets
                uploaded in the application.
              </Typography>
              <Icon as={ExternalLink} />
            </Flex>
          </a>
        </Flex>
        <KapaPrompt />
      </ModalBody>
    </ModalLayout>
  );
};

export { StrapiAssistantModal };
