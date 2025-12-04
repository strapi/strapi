/* eslint-disable import/no-default-export */
import * as React from 'react';

import { Button } from '@strapi/design-system';
import { Page } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useGetInfoQuery } from '../services/api';
import { getTrad } from '../utils';

const ScalarContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 200px);
  position: relative;
  top: -32px;

  #scalar-app {
    width: 100%;
    height: 100%;
    min-height: calc(100vh - 200px);
  }
`;

const ButtonContainer = styled.div`
  position: relative;
  top: 20px;
  right: 60px;
  z-index: 10000;
  display: flex;
  justify-content: end;
`;

const App = () => {
  const { formatMessage } = useIntl();
  const { data, isLoading: isLoadingInfo, isError } = useGetInfoQuery();
  const scalarContainerRef = React.useRef<HTMLDivElement>(null);
  const scalarLoadedRef = React.useRef<boolean>(false);

  // Inject Scalar styles
  React.useEffect(() => {
    const styleId = 'scalar-strapi-theme';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .light-mode {
        --scalar-color-1: #32324d;
        --scalar-color-2: rgba(50, 50, 77, 0.6);
        --scalar-color-3: rgba(50, 50, 77, 0.4);
        --scalar-color-accent: #4945ff;
        --scalar-background-1: #ffffff;
        --scalar-background-2: #f6f6f9;
        --scalar-background-3: #eaeaef;
        --scalar-background-accent: #f0f0ff;
        --scalar-border-color: rgba(0, 0, 0, 0.08);
        --scalar-sidebar-background-1: #ffffff;
        --scalar-sidebar-item-hover-background: #f6f6f9;
        --scalar-sidebar-item-active-background: #f0f0ff;
        --scalar-sidebar-border-color: rgba(0, 0, 0, 0.08);
        --scalar-sidebar-color-1: #32324d;
        --scalar-sidebar-color-2: #666687;
        --scalar-sidebar-color-active: #271fe0;
        --scalar-sidebar-search-background: #f6f6f9;
        --scalar-sidebar-search-border-color: rgba(0, 0, 0, 0.08);
        --scalar-sidebar-search-color: #666687;
        --scalar-button-1-background: #4945ff;
        --scalar-button-1-color: #ffffff;
        --scalar-button-1-hover-background: #271fe0;
      }

      .dark-mode {
        --scalar-color-1: #eaeaef;
        --scalar-color-2: rgba(234, 234, 239, 0.6);
        --scalar-color-3: rgba(234, 234, 239, 0.4);
        --scalar-color-accent: #7b79ff;
        --scalar-background-1: #181826;
        --scalar-background-2: #212134;
        --scalar-background-3: #2a2a3e;
        --scalar-background-accent: #2a2a3e;
        --scalar-border-color: rgba(255, 255, 255, 0.1);
        --scalar-sidebar-background-1: #212134;
        --scalar-sidebar-item-hover-background: #212134;
        --scalar-sidebar-item-active-background: #2a2a3e;
        --scalar-sidebar-border-color: rgba(255, 255, 255, 0.1);
        --scalar-sidebar-color-1: #eaeaef;
        --scalar-sidebar-color-2: #a5a5ba;
        --scalar-sidebar-color-active: #7b79ff;
        --scalar-sidebar-search-background: #212134;
        --scalar-sidebar-search-border-color: rgba(255, 255, 255, 0.1);
        --scalar-sidebar-search-color: #a5a5ba;
        --scalar-button-1-background: #7b79ff;
        --scalar-button-1-color: #ffffff;
        --scalar-button-1-hover-background: #6b69ff;
      }
      [data-theme-selector],
      .theme-selector,
      button[aria-label*='theme'],
      button[aria-label*='Theme'] {
        display: none !important;
      }

      /* Set initial background to prevent flash */
      #scalar-app {
        background-color: #ffffff;
        min-height: 100%;
      }

      #scalar-app.dark-mode {
        background-color: #181826;
      }

      /* Add header to sidebar container via ::before */
      #scalar-app aside::before,
      #scalar-app .sidebar::before {
        content: 'API documentation' !important;
        position: sticky !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        display: block !important;
        background-color: transparent !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
        padding: 17px 23px !important;
        font-weight: 600 !important;
        font-size: 1.8rem !important;
        line-height: 1.22 !important;
        color: var(--scalar-color-1, #32324d) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        z-index: 10 !important;
        margin-bottom: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Dark mode header styling */
      #scalar-app.dark-mode aside::before,
      #scalar-app.dark-mode .sidebar::before {
        border-bottom-color: rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
      }

      /* Prevent ::before on nested elements inside sidebar */
      #scalar-app aside *::before,
      #scalar-app .sidebar *::before {
        content: none !important;
      }

      /* Force sidebar background color in dark mode */
      #scalar-app.dark-mode aside,
      #scalar-app.dark-mode .sidebar,
      #scalar-app.dark-mode [class*="sidebar"],
      #scalar-app.dark-mode [class*="Sidebar"] {
        background-color: #212134 !important;
      }

    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // Get current Strapi theme
  const getStrapiTheme = (): 'light' | 'dark' => {
    const storedTheme = localStorage.getItem('STRAPI_THEME') || 'system';

    if (storedTheme === 'system') {
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return storedTheme as 'light' | 'dark';
  };

  // Apply theme to Scalar
  const applyThemeToScalar = (theme: 'light' | 'dark') => {
    if (!scalarContainerRef.current) {
      return;
    }

    const scalarApp = scalarContainerRef.current.querySelector('#scalar-app');
    if (!scalarApp) {
      return;
    }

    // Remove existing theme classes
    scalarApp.classList.remove('light-mode', 'dark-mode');

    // Apply the theme
    if (theme === 'dark') {
      scalarApp.classList.add('dark-mode');
    } else {
      scalarApp.classList.add('light-mode');
    }
  };

  // Apply theme immediately on mount to prevent flash
  React.useEffect(() => {
    if (scalarContainerRef.current) {
      const currentTheme = getStrapiTheme();
      // If scalar-app already exists, apply theme immediately
      const scalarApp = scalarContainerRef.current.querySelector('#scalar-app');
      if (scalarApp) {
        applyThemeToScalar(currentTheme);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!data?.currentVersion || !scalarContainerRef.current || scalarLoadedRef.current) {
      return;
    }

    const loadScalar = async () => {
      try {
        // Check if Scalar is already loaded
        if (typeof (window as any).Scalar === 'undefined') {
          // Load Scalar from CDN
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest';
          script.async = true;
          script.onload = () => {
            initializeScalar();
          };
          document.head.appendChild(script);
        } else {
          initializeScalar();
        }
      } catch (error) {
        console.error('Error loading Scalar:', error);
      }
    };

    const initializeScalar = () => {
      if (!scalarContainerRef.current || scalarLoadedRef.current) {
        return;
      }

      const specUrl = `${window.strapi.backendURL}/documentation/spec/${data.currentVersion}`;

      // Get theme before creating container
      const currentTheme = getStrapiTheme();

      // Create a container div for Scalar
      const scalarApp = document.createElement('div');
      scalarApp.id = 'scalar-app';

      // Apply theme class IMMEDIATELY when creating the element
      if (currentTheme === 'dark') {
        scalarApp.classList.add('dark-mode');
      } else {
        scalarApp.classList.add('light-mode');
      }

      scalarContainerRef.current.innerHTML = '';
      scalarContainerRef.current.appendChild(scalarApp);

      // Initialize Scalar
      if ((window as any).Scalar) {
        (window as any).Scalar.createApiReference('#scalar-app', {
          url: specUrl,
          showDeveloperTools: 'never',
          hideClientButton: true,
          hideDarkModeToggle: true,
          defaultHttpClient: {
            targetKey: 'node',
            clientKey: 'undici',
          },
        });
        scalarLoadedRef.current = true;
      }
    };

    loadScalar();

    // Listen for theme changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'STRAPI_THEME') {
        const newTheme = getStrapiTheme();
        applyThemeToScalar(newTheme);
      }
    };

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const storedTheme = localStorage.getItem('STRAPI_THEME') || 'system';
      if (storedTheme === 'system') {
        const newTheme = getStrapiTheme();
        applyThemeToScalar(newTheme);
      }
    };

    // Poll for theme changes (for same-window changes)
    let lastTheme = getStrapiTheme();
    const themeCheckInterval = setInterval(() => {
      const currentTheme = getStrapiTheme();
      if (currentTheme !== lastTheme) {
        lastTheme = currentTheme;
        applyThemeToScalar(currentTheme);
      }
    }, 500);

    window.addEventListener('storage', handleStorageChange);
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Cleanup function
    return () => {
      clearInterval(themeCheckInterval);
      window.removeEventListener('storage', handleStorageChange);
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
      if (scalarContainerRef.current) {
        scalarContainerRef.current.innerHTML = '';
      }
      scalarLoadedRef.current = false;
    };
  }, [data?.currentVersion]);

  // Re-initialize when version changes
  React.useEffect(() => {
    scalarLoadedRef.current = false;
  }, [data?.currentVersion]);

  if (isLoadingInfo) {
    return <Page.Loading />;
  }

  if (isError) {
    return <Page.Error />;
  }

  if (!data?.currentVersion) {
    return (
      <Page.Main>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>
            {formatMessage({
              id: getTrad('pages.PluginPage.noVersion'),
              defaultMessage:
                'No documentation version available. Please generate documentation first.',
            })}
          </p>
        </div>
      </Page.Main>
    );
  }

  const handleOpenDocumentation = () => {
    if (!data?.currentVersion) {
      return;
    }
    const documentationUrl = `${window.strapi.backendURL}/documentation/v${data.currentVersion}`;
    window.open(documentationUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Page.Main>
      <ButtonContainer>
        <Button onClick={handleOpenDocumentation} size="S" variant="default">
          {formatMessage({
            id: getTrad('pages.PluginPage.Button.open'),
            defaultMessage: 'Open documentation',
          })}
        </Button>
      </ButtonContainer>
      <ScalarContainer ref={scalarContainerRef} />
    </Page.Main>
  );
};

export { App };
