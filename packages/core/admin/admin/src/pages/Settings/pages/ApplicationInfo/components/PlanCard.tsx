import * as React from 'react';

import { Flex, Grid, LinkButton, Typography } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';

import {
  getProjectType,
  type ProjectType,
} from '../../../../../../../shared/utils/get-project-type';
import { useGetLicenseLimitsQuery } from '../../../../../services/admin';

/* -------------------------------------------------------------------------------------------------
 * PlanDetail
 * -----------------------------------------------------------------------------------------------*/

interface PlanDetailProps {
  label: MessageDescriptor;
  value: React.ReactNode;
}

/**
 * A single labelled value rendered inside the Plan card's `<dl>`. Shared between the CE fallback
 * body (current plan only) and the EE body (license details), so both stay visually consistent.
 */
const PlanDetail = ({ label, value }: PlanDetailProps) => {
  const { formatMessage } = useIntl();

  return (
    <Grid.Item col={6} xs={12} direction="column" alignItems="start">
      <Typography variant="sigma" textColor="neutral600" tag="dt">
        {formatMessage(label)}
      </Typography>
      <Typography tag="dd">{value}</Typography>
    </Grid.Item>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PlanCard
 * -----------------------------------------------------------------------------------------------*/

/**
 * The billing link's label and destination depend on the current plan: Community links out to the
 * public pricing page, while Growth and Enterprise link to the billing portal.
 */
const PLAN_LINK: Record<ProjectType, { label: MessageDescriptor; href: string }> = {
  Community: {
    label: { id: 'Settings.application.plan.see-all-plans', defaultMessage: 'See all plans' },
    href: 'https://strapi.io/pricing-self-hosted',
  },
  Growth: {
    label: {
      id: 'Settings.application.plan.manage-subscription',
      defaultMessage: 'Manage subscription',
    },
    href: 'https://billing.strapi.io',
  },
  Enterprise: {
    label: {
      id: 'Settings.application.plan.view-subscription',
      defaultMessage: 'View subscription',
    },
    href: 'https://billing.strapi.io',
  },
};

const PlanCardBodyCE = () => (
  <Grid.Root gap={5} tag="dl">
    <PlanDetail
      label={{ id: 'Settings.application.plan.current', defaultMessage: 'current plan' }}
      value={window.strapi.projectType}
    />
  </Grid.Root>
);

const PlanCard = () => {
  const { formatMessage } = useIntl();

  // The authenticated license-limit-information endpoint is EE-only, so a CE instance gets a
  // 404 here; treat that (or any other error/missing data) the same as "no license".
  const { data: licenseLimitsData } = useGetLicenseLimitsQuery();
  const licenseStatus = licenseLimitsData?.data?.licenseStatus ?? 'none';
  const planPriceId = licenseLimitsData?.data?.planPriceId ?? undefined;

  // `useEnterprise`'s `enabled` option only ANDs with `isEE` - it can never force the EE body
  // on for a non-EE instance. An expired/unknown license still needs to show its retained
  // details even though `isEE` is (correctly) false, so the license body is loaded manually
  // here instead, gated on this wider predicate.
  // Deliberately an allowlist rather than `!== 'none'`: if `licenseStatus` is ever missing
  // (an older bundle, a consumer building `window.strapi` itself), this must fall back to the
  // Community body instead of loading the license section.
  const shouldShowLicenseDetails =
    window.strapi.isEE || licenseStatus === 'expired' || licenseStatus === 'unknown';
  const [LicenseBody, setLicenseBody] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    if (!shouldShowLicenseDetails) {
      return undefined;
    }

    let active = true;

    import(
      '../../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/LicenseInfo'
    ).then((mod) => {
      if (active) {
        setLicenseBody(() => mod.LicenseInfoEE);
      }
    });

    return () => {
      active = false;
    };
  }, [shouldShowLicenseDetails]);

  // Render nothing for the body while the EE module is still loading (rather than the CE
  // body) so the card never briefly shows "Community" before swapping to the actual license
  // details. Once we know for certain there is no license to show, fall back to the CE body.
  const PlanCardBody = LicenseBody ?? (shouldShowLicenseDetails ? null : PlanCardBodyCE);

  const licensedPlan = getProjectType({ isEE: licenseStatus !== 'none', planPriceId });
  const { label, href } = PLAN_LINK[licensedPlan] ?? PLAN_LINK.Community;

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      gap={4}
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingRight={7}
      paddingLeft={7}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta" tag="h3">
          {formatMessage({ id: 'Settings.application.plan.title', defaultMessage: 'Plan' })}
        </Typography>
        <LinkButton
          variant="secondary"
          endIcon={<ExternalLink />}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatMessage(label)}
        </LinkButton>
      </Flex>
      {PlanCardBody && <PlanCardBody />}
    </Flex>
  );
};

export { PlanCard, PlanDetail };
export type { PlanDetailProps };
