import * as React from 'react';

import { Flex, Icon, ModalBody, ModalHeader, ModalLayout, Typography } from '@strapi/design-system';
import { ExternalLink, Book } from '@strapi/icons';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import StrapiLogo from '../assets/images/logo-strapi-2022.svg';
import { getOnboardingDocLink } from '../utils/getOnboardingDocLink';

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

export interface DocInfo {
  route: string;
  title: string;
  description: string | null;
  link: string;
}

const StrapiAssistantModal = ({ onClose }: StrapiAssistantModal) => {
  const location = useLocation();
  const modalBodyRef = React.useRef<HTMLDivElement>(null);
  const [docInfo, setDocInfo] = React.useState<DocInfo>({
    route: '/',
    title: 'General',
    description: 'Get set up in minutes to build any projects in hours instead of weeks.',
    link: 'https://docs.strapi.io',
  });

  React.useEffect(() => {
    const fetchDocInfo = async () => {
      const res = await getOnboardingDocLink(location.pathname);
      if (res) {
        setDocInfo(res);
      }
    };

    fetchDocInfo();
  }, [location.pathname]);

  return (
    <ModalLayout labelledBy="title" onClose={onClose}>
      <ModalHeader>
        <Flex gap={4}>
          <Preview src={StrapiLogo} alt="" />
          <Typography variant="beta" fontWeight="semiBold">
            Strapi assistant
          </Typography>
        </Flex>
      </ModalHeader>
      <ModalBody id="kapa-modal-layout">
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography variant="delta" fontWeight="bold">
            Looking for the {docInfo.title} documentation?
          </Typography>
          <a
            href={docInfo.link}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none' }}
          >
            <Flex borderColor="neutral150" gap={2} padding={4}>
              <Icon as={Book} width={8} height={8} />
              <Flex flex={1}>
                <Typography>{docInfo.description}</Typography>
              </Flex>
              <Icon as={ExternalLink} />
            </Flex>
          </a>
        </Flex>
        <KapaPrompt modalBodyRef={modalBodyRef} />
      </ModalBody>
    </ModalLayout>
  );
};

export { StrapiAssistantModal };
