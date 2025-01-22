import {
  SubNav,
  SubNavHeader,
  SubNavLink,
  SubNavSection,
  SubNavSections,
} from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { useEffect, useRef, useCallback, Fragment } from "react";
import { useTracking } from '../../../features/Tracking';
import { SettingsMenu } from '../../../hooks/useSettingsMenu';


// Custom hook to handle scroll locking
const usePreventScroll = (ref: React.RefObject<HTMLDivElement>) => {
  // const handleScroll = useCallback((event: WheelEvent) => {
  //   const sidebar = ref.current;
  //   if (!sidebar) return;

  //   const isAtTop = sidebar.scrollTop === 0;
  //   const isAtBottom = sidebar.scrollHeight - sidebar.scrollTop === sidebar.clientHeight;

  //   if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
  //     event.preventDefault();
  //     event.stopPropagation();  // Prevents bubbling to parent
  //   }
  // }, []);

  const handleScroll = useCallback((event: WheelEvent) => {
    const sidebar = ref.current;
    if (!sidebar) return;

    const { scrollTop, scrollHeight, clientHeight } = sidebar;
    const isAtTop = scrollTop <= 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight;

    if ((isAtTop && event.deltaY < 0) || (isAtBottom && event.deltaY > 0)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    const sidebar = ref.current;
    if (!sidebar) return;

    sidebar.addEventListener("wheel", handleScroll, { passive: false });

    return () => {
      sidebar.removeEventListener("wheel", handleScroll);
    };
  }, [handleScroll]);
};


const CustomIcon = styled(Lightning)`
  right: 15px;
  position: absolute;
  bottom: 50%;
  transform: translateY(50%);

  path {
    fill: ${({ theme }) => theme.colors.warning500};
  }
`;

const SubNavStyled = styled(SubNav)`
  overflow-y: auto !important;
  overflow-x: hidden !important;
  max-height: 100vh;
`;

const Link = styled(SubNavLink)`
  &.active ${CustomIcon} {
    right: 13px;
  }
`;

interface SettingsNavProps {
  menu: SettingsMenu;
}

const SettingsNav = ({ menu }: SettingsNavProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();

  const settingsSidebarRef = useRef<HTMLDivElement>(null);
  usePreventScroll(settingsSidebarRef);

  const filteredMenu = menu.filter(
    (section) => !section.links.every((link) => link.isDisplayed === false)
  );

  const sections = filteredMenu.map((section) => {
    return {
      ...section,
      title: section.intlLabel,
      links: section.links.map((link) => {
        return {
          ...link,
          title: link.intlLabel,
          name: link.id,
        };
      }),
    };
  });

  const label = formatMessage({
    id: 'global.settings',
    defaultMessage: 'Settings',
  });

  const handleClickOnLink = (destination: string) => () => {
    trackUsage('willNavigate', { from: pathname, to: destination });
  };



  return (
    <SubNavStyled ref={settingsSidebarRef} aria-label={label}>
      <SubNavHeader label={label} />
      <SubNavSections>
        {sections.map((section) => (
          <SubNavSection key={section.id} label={formatMessage(section.intlLabel)}>
            {section.links.map((link) => {
              return (
                <Link
                  tag={NavLink}
                  withBullet={link.hasNotification}
                  to={link.to}
                  onClick={handleClickOnLink(link.to)}
                  key={link.id}
                  position="relative"
                >
                  {formatMessage(link.intlLabel)}
                  {link?.licenseOnly && <CustomIcon width="1.5rem" height="1.5rem" />}
                </Link>
              );
            })}
          </SubNavSection>
        ))}
      </SubNavSections>
    </SubNavStyled>
  );
};

export { SettingsNav };
export type { SettingsNavProps };
