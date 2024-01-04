import * as React from 'react';

import { useStrapiApp } from '@strapi/helper-plugin';
import { render, screen } from '@tests/utils';

import { useMenu } from '../../hooks/useMenu';
import { Admin } from '../Admin';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useStrapiApp: jest.fn(() => ({ menu: [] })),
  CheckPagePermissions: ({ children }: { children: React.ReactNode }) => children,
  useGuidedTour: jest.fn(() => ({
    guidedTourState: {
      contentTypeBuilder: {
        create: false,
        success: false,
      },
    },
    currentStep: null,
    isGuidedTourVisible: false,
  })),
}));

jest.mock('../../hooks/useMenu', () => ({
  useMenu: jest.fn(() => ({ isLoading: true, generalSectionLinks: [], pluginsSectionLinks: [] })),
}));

jest.mock('../../components/LeftMenu', () => ({
  LeftMenu() {
    return <div>menu</div>;
  },
}));

jest.mock('../HomePage', () => ({
  HomePage() {
    return <div>HomePage</div>;
  },
}));

describe('<Admin />', () => {
  it('should not crash', () => {
    render(<Admin />);

    expect(screen.getByText('Loading content.')).toBeInTheDocument();
  });

  it('should create the plugin routes correctly', async () => {
    // @ts-expect-error – mock implementation
    useStrapiApp.mockImplementation(() => ({
      menu: [
        {
          to: '/plugins/ctb',
        },
        {
          to: '/plugins/documentation',
          Component: () => ({ default: () => <div>DOCUMENTATION PLUGIN</div> }),
        },
      ],
    }));

    // @ts-expect-error – mock implementation
    useMenu.mockImplementation(() => ({
      isLoading: false,
      generalSectionLinks: [],
      pluginsSectionLinks: [],
    }));

    render(<Admin />);

    await screen.findByText('HomePage');
  });
});
