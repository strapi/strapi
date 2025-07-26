import { Badge, Divider } from '@strapi/design-system';
import { Lightning } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { styled } from 'styled-components';

import { useLicenseLimits } from '../../../../../ee/admin/src/hooks/useLicenseLimits';
import { SubNav } from '../../../components/SubNav';
import { useTracking } from '../../../features/Tracking';
import { SettingsMenu } from '../../../hooks/useSettingsMenu';

type LinkId =
  | 'content-releases'
  | 'review-workflows'
  | 'sso'
  | 'auditLogs'
  | 'auditLogs-purchase-page';

type FeatureName = 'cms-content-releases' | 'review-workflows' | 'sso' | 'audit-logs';

interface SettingsNavProps {
  menu: SettingsMenu;
}

const StyledBadge = styled(Badge)`
  border-radius: 50%;
  padding: ${({ theme }) => theme.spaces[2]};
  height: 2rem;
`;

const SettingsNav = ({ menu }: SettingsNavProps) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { pathname } = useLocation();
  const { license } = useLicenseLimits();

  const availableFeatureNames = license?.features.map((feature) => feature.name);

  const linksIdsToLicenseFeaturesNames: Record<LinkId, FeatureName> = {
    'content-releases': 'cms-content-releases',
    'review-workflows': 'review-workflows',
    sso: 'sso',
    auditLogs: 'audit-logs',
    'auditLogs-purchase-page': 'audit-logs',
  };

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
          id: link.id as LinkId,
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
    <SubNav.Main aria-label={label}>
      <SubNav.Header label={label} />
      <Divider background="neutral150" marginBottom={5} />
      <SubNav.Sections>
        {sections.map((section) => (
          <SubNav.Section key={section.id} label={formatMessage(section.intlLabel)}>
            {section.links.map((link) => {
              return (
                <SubNav.Link
                  to={link.to}
                  onClick={handleClickOnLink(link.to)}
                  key={link.id}
                  label={formatMessage(link.intlLabel)}
                  endAction={
                    <>
                      {link?.licenseOnly && (
                        <Lightning
                          fill={
                            (availableFeatureNames || []).includes(
                              linksIdsToLicenseFeaturesNames[link.id]
                            )
                              ? 'primary600'
                              : 'neutral300'
                          }
                          width="1.5rem"
                          height="1.5rem"
                        />
                      )}
                      {link?.hasNotification && (
                        <StyledBadge
                          aria-label="Notification"
                          backgroundColor="primary600"
                          textColor="neutral0"
                        >
                          1
                        </StyledBadge>
                      )}
                    </>
                  }
                />
              );
            })}
          </SubNav.Section>
        ))}
      </SubNav.Sections>
    </SubNav.Main>
  );
};

export { SettingsNav };
export type { SettingsNavProps };
