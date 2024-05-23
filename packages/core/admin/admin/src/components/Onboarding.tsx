import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Icon,
  PopoverPrimitives,
  Portal,
  Typography,
} from '@strapi/design-system';
import { Cross, Question, Book, PaperPlane } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import StrapiLogo from '../assets/images/logo-strapi-2022.svg';

import { SparkIcon } from './SparkIcon';

const Onboarding = () => {
  const triggerRef = React.useRef<HTMLButtonElement>(null!);
  const [isOpen, setIsOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  // const { communityEdition } = useAppInfo();

  const handlePopoverVisibility = () => {
    loadKapaScript();
    setIsOpen((prev) => !prev);
  };

  // const docLinks = [
  //   ...DOCUMENTATION_LINKS,
  //   {
  //     label: { id: 'Settings.application.get-help', defaultMessage: 'Get help' },
  //     icon: Message,
  //     href: communityEdition
  //       ? 'https://discord.strapi.io'
  //       : 'https://support.strapi.io/support/home',
  //   },
  // ];

  // React.useEffect(() => {
  //   const script = document.getElementsByTagName("a[href='http://domain.example']");

  //   return () => {
  //     document.body.removeChild(script);
  //   };
  // }, []);

  const loadKapaScript = () => {
    const script = document.createElement('script');

    script.src = 'https://widget.kapa.ai/kapa-widget.bundle.js';
    script.async = true;

    script.setAttribute('data-website-id', 'f1838a12-ad58-4224-9fab-2f0704eeeb52');
    script.setAttribute('data-project-name', 'Strapi');
    script.setAttribute('data-project-color', '#4945FF');
    script.setAttribute('data-project-logo', 'https://strapi.io/assets/favicon-32x32.png');
    script.setAttribute('data-button-hide', 'true');
    script.setAttribute('data-modal-open-on-command-k', 'true');
    script.setAttribute('data-modal-override-open-class', 'ai-modal-open-action');
    script.setAttribute(
      'data-modal-disclaimer',
      'Disclaimer: Answers are AI-generated and might be inaccurate. Please ensure you double-check the information provided by visiting source pages.'
    );
    script.setAttribute('data-modal-title', 'Strapi Media library AI assistant');
    script.setAttribute(
      'data-modal-example-questions',
      '[Canny] Permission Management for Media Library Folders?, How to use media library filters?, How to upload a file?, Where is the video of Marco running from ducks?'
    );

    document.body.appendChild(script);
  };

  return (
    <Box as="aside" position="fixed" bottom={2} right={4}>
      <HelperButton
        aria-label={formatMessage(
          isOpen
            ? {
                id: 'app.components.Onboarding.help.button-close',
                defaultMessage: 'Close help menu',
              }
            : {
                id: 'app.components.Onboarding.help.button',
                defaultMessage: 'Open help menu',
              }
        )}
        onClick={handlePopoverVisibility}
        ref={triggerRef}
      >
        <Icon as={isOpen ? Cross : Question} color="buttonNeutral0" />
      </HelperButton>

      {isOpen && (
        <Portal>
          <PopoverPrimitives.Content
            padding={0}
            onDismiss={handlePopoverVisibility}
            source={triggerRef}
            placement="top-end"
            spacing={12}
          >
            <Flex maxWidth="600px" direction="column" alignItems="stretch" gap={2} padding={4}>
              <Typography variant="beta" fontWeight="bold">
                Looking for the Media library documentation?
              </Typography>
              <Typography variant="epsilon">We&apos;ve got you covered!</Typography>
              <a
                href="https://docs.strapi.io/user-docs/media-library"
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Flex borderColor="neutral150" gap={2} padding={4}>
                  <Preview src={StrapiLogo} alt="" />
                  <Typography>
                    Introduction to the Media Library which allows to display and manage all assets
                    uploaded in the application.
                  </Typography>
                </Flex>
              </a>
              <Box>
                <Button className="ai-modal-open-action" startIcon={<Icon as={SparkIcon} />}>
                  Ask AI!
                </Button>
              </Box>
            </Flex>
          </PopoverPrimitives.Content>
        </Portal>
      )}
    </Box>
  );
};

// TODO: use new Button props derived from Box props with next DS release
const HelperButton = styled(Button)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[3]};
  /* Resetting 2rem height defined by Button component */
  height: 100%;
`;
// const HelperButton = styled.button`
//   position: relative;
//   border-radius: 8px;
//   padding: ${({ theme }) => theme.spaces[3]};
//   background: ${({ theme }) => theme.colors.buttonNeutral0};

//   &:before,
//   &:after {
//     border-radius: 8px;
//     content: '';
//     position: absolute;
//     top: -2px;
//     left: -2px;
//     width: calc(100% + 4px);
//     height: calc(100% + 4px);
//     background: linear-gradient(
//       45deg,
//       #fb0094,
//       #0000ff,
//       #00ff00,
//       #ffff00,
//       #ff0000,
//       #fb0094,
//       #0000ff,
//       #00ff00,
//       #ffff00,
//       #ff0000
//     );
//     background-size: 400%;
//     z-index: -1;
//     animation: shadow 20s linear infinite;
//   }

//   &:after {
//     top: -8px;
//     left: -8px;
//     width: calc(100% + 16px);
//     height: calc(100% + 16px);
//     filter: blur(24px);
//     opacity: 0.9;
//   }

//   @keyframes shadow {
//     0% {
//       background-position: 0 0;
//     }
//     50.01% {
//       background-position: 200% 0;
//     }
//     100% {
//       background-position: 0 0;
//     }
//   }
// `;

const IconWrapper = styled(Flex)`
  transform: translate(-50%, -50%);
`;

const VideoLinkWrapper = styled(Flex)`
  text-decoration: none;

  :focus-visible {
    outline-offset: ${({ theme }) => `-${theme.spaces[1]}`};
  }

  :hover {
    background: ${({ theme }) => theme.colors.primary100};

    /* Hover style for the number displayed */
    ${Typography}:first-child {
      color: ${({ theme }) => theme.colors.primary500};
    }

    /* Hover style for the label */
    ${Typography}:nth-child(1) {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const Preview = styled.img`
  width: ${({ theme }) => theme.spaces[10]};
  height: ${({ theme }) => theme.spaces[8]};
  /* Same overlay used in ModalLayout */
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const TypographyLineHeight = styled(Typography)`
  /* line height of label and watch more to 1 so they can be better aligned visually */
  line-height: 1;
`;

const TextLink = styled(TypographyLineHeight)`
  text-decoration: none;

  :hover {
    text-decoration: underline;
  }
`;

const VIDEO_LINKS = [
  {
    label: {
      id: 'app.components.Onboarding.link.build-content',
      defaultMessage: 'Build a content architecture',
    },
    href: 'https://www.youtube.com/watch?v=G9GjN0RxhkE',
    duration: '5:48',
  },
  {
    label: {
      id: 'app.components.Onboarding.link.manage-content',
      defaultMessage: 'Add & manage content',
    },
    href: 'https://www.youtube.com/watch?v=DEZw4KbybAI',
    duration: '3:18',
  },
  {
    label: { id: 'app.components.Onboarding.link.manage-media', defaultMessage: 'Manage media' },
    href: 'https://www.youtube.com/watch?v=-61MuiMQb38',
    duration: '3:41',
  },
];

const WATCH_MORE = {
  href: 'https://www.youtube.com/playlist?list=PL7Q0DQYATmvidz6lEmwE5nIcOAYagxWqq',
  label: {
    id: 'app.components.Onboarding.link.more-videos',
    defaultMessage: 'Watch more videos',
  },
};

const DOCUMENTATION_LINKS = [
  {
    label: { id: 'global.documentation', defaultMessage: 'documentation' },
    href: 'https://docs.strapi.io',
    icon: Book,
  },
  {
    label: { id: 'app.static.links.cheatsheet', defaultMessage: 'cheatsheet' },
    href: 'https://strapi-showcase.s3-us-west-2.amazonaws.com/CheatSheet.pdf',
    icon: PaperPlane,
  },
];

export { Onboarding };
