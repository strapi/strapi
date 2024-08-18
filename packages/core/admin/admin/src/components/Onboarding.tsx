import * as React from 'react';

import {
  Box,
  Button,
  Divider,
  Flex,
  FlexComponent,
  Popover,
  Typography,
  TypographyComponent,
  VisuallyHidden,
} from '@strapi/design-system';
import { Cross, Message, Play, Question, Book, PaperPlane } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import onboardingPreview from '../assets/images/onboarding-preview.png';
import { useAppInfo } from '../features/AppInfo';

const Onboarding = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  const communityEdition = useAppInfo('Onboarding', (state) => state.communityEdition);

  const docLinks = [
    ...DOCUMENTATION_LINKS,
    {
      label: { id: 'Settings.application.get-help', defaultMessage: 'Get help' },
      icon: Message,
      href: communityEdition
        ? 'https://discord.strapi.io'
        : 'https://support.strapi.io/support/home',
    },
  ];

  const Icon = isOpen ? Cross : Question;

  return (
    <Popover.Root onOpenChange={setIsOpen}>
      <Box position="fixed" bottom={2} right={2}>
        <Popover.Trigger>
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
          >
            <Icon fill="buttonNeutral0" />
          </HelperButton>
        </Popover.Trigger>
        <Popover.Content align="end" side="top" sideOffset={12}>
          <Flex
            justifyContent="space-between"
            paddingBottom={5}
            paddingRight={6}
            paddingLeft={6}
            paddingTop={6}
          >
            <TypographyLineHeight fontWeight="bold">
              {formatMessage({
                id: 'app.components.Onboarding.title',
                defaultMessage: 'Get started videos',
              })}
            </TypographyLineHeight>
            <TextLink
              tag="a"
              href={WATCH_MORE.href}
              target="_blank"
              rel="noreferrer noopener"
              variant="pi"
              textColor="primary600"
            >
              {formatMessage(WATCH_MORE.label)}
            </TextLink>
          </Flex>
          <Divider />
          {VIDEO_LINKS.map(({ href, duration, label }, index) => (
            <VideoLinkWrapper
              tag="a"
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              key={href}
              hasRadius
              paddingTop={4}
              paddingBottom={4}
              paddingLeft={6}
              paddingRight={11}
            >
              <Box paddingRight={5}>
                <Number textColor="neutral200" variant="alpha">
                  {index + 1}
                </Number>
              </Box>
              <Box position="relative">
                <Preview src={onboardingPreview} alt="" />
                <IconWrapper
                  position="absolute"
                  top="50%"
                  left="50%"
                  background="primary600"
                  borderRadius="50%"
                  justifyContent="center"
                  width={6}
                  height={6}
                >
                  <Play fill="buttonNeutral0" width="1.2rem" height="1.2rem" />
                </IconWrapper>
              </Box>
              <Flex direction="column" alignItems="start" paddingLeft={4}>
                <Label fontWeight="bold">{formatMessage(label)}</Label>
                <VisuallyHidden>:</VisuallyHidden>
                <Typography textColor="neutral600" variant="pi">
                  {duration}
                </Typography>
              </Flex>
            </VideoLinkWrapper>
          ))}
          <Flex
            direction="column"
            alignItems="stretch"
            gap={2}
            paddingLeft={5}
            paddingTop={2}
            paddingBottom={5}
          >
            {docLinks.map(({ label, href, icon: Icon }) => (
              <Flex gap={3} key={href}>
                <Icon fill="primary600" />
                <TextLink
                  tag="a"
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="sigma"
                  textColor="primary700"
                >
                  {formatMessage(label)}
                </TextLink>
              </Flex>
            ))}
          </Flex>
        </Popover.Content>
      </Box>
    </Popover.Root>
  );
};

// TODO: use new Button props derived from Box props with next DS release
const HelperButton = styled(Button)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[3]};
  /* Resetting 2rem height defined by Button component */
  height: unset;
  width: unset;

  & > span {
    display: flex;

    svg {
      width: 1.6rem;
      height: 1.6rem;
    }
  }
`;

const IconWrapper = styled<FlexComponent>(Flex)`
  transform: translate(-50%, -50%);
`;

const Number = styled<TypographyComponent>(Typography)``;

const Label = styled<TypographyComponent>(Typography)``;

const VideoLinkWrapper = styled<FlexComponent<'a'>>(Flex)`
  text-decoration: none;

  :focus-visible {
    outline-offset: ${({ theme }) => `-${theme.spaces[1]}`};
  }

  :hover {
    background: ${({ theme }) => theme.colors.primary100};

    /* Hover style for the number displayed */
    ${Number} {
      color: ${({ theme }) => theme.colors.primary500};
    }

    /* Hover style for the label */
    ${Label} {
      color: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

const Preview = styled.img`
  width: ${({ theme }) => theme.spaces[10]};
  height: ${({ theme }) => theme.spaces[8]};
  /* Same overlay used in ModalLayout */
  background: ${({ theme }) => `${theme.colors.neutral800}1F`};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const TypographyLineHeight = styled<TypographyComponent>(Typography)`
  /* line height of label and watch more to 1 so they can be better aligned visually */
  line-height: 1;
`;

const TextLink = styled<TypographyComponent<'a'>>(Typography)`
  text-decoration: none;
  line-height: 1;

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
