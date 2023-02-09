import { Book, PaperPlane } from '@strapi/icons';

export const VIDEO_LINKS = [
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

export const WATCH_MORE = {
  href: 'https://www.youtube.com/playlist?list=PL7Q0DQYATmvidz6lEmwE5nIcOAYagxWqq',
  label: {
    id: 'app.components.Onboarding.link.more-videos',
    defaultMessage: 'Watch more videos',
  },
};

export const DOCUMENTATION_LINKS = [
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
