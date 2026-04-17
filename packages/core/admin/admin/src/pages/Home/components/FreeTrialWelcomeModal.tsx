import * as React from 'react';

import { Button, Flex, Modal, Typography } from '@strapi/design-system';
import {
  Calendar,
  Eye,
  Key,
  Layer,
  Picture,
  Translate,
} from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FreeTrialWelcomeModalProps {
  onClose: () => void;
}

interface Feature {
  icon: React.ReactNode;
  titleId: string;
  titleDefault: string;
  descId: string;
  descDefault: string;
  isAI?: boolean;
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Styled primitives
// ---------------------------------------------------------------------------

const ModalHeader = styled(Flex)`
  background: linear-gradient(135deg, #4945ff 0%, #7b61ff 60%, #ac73e5 100%);
  border-radius: 4px 4px 0 0;
  padding: 2.8rem 2.8rem 2.4rem;
`;

const TrialBadge = styled.span`
  background: rgba(255, 255, 255, 0.22);
  border-radius: 6px;
  padding: 0.4rem 1rem;
  font-size: 1.2rem;
  font-weight: 500;
  color: #fff;
  letter-spacing: 0.05em;
  display: inline-block;
  margin-bottom: 0.8rem;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const FeatureCard = styled.div<{ $isAI?: boolean; $fullWidth?: boolean }>`
  border: 0.5px solid
    ${({ $isAI }) => ($isAI ? '#ac73e5' : 'rgba(220, 220, 228, 0.6)')};
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  background: ${({ $isAI }) => ($isAI ? '#f8f5ff' : '#f6f6f9')};
  grid-column: ${({ $fullWidth }) => ($fullWidth ? '1 / -1' : 'auto')};
`;

const IconWrapper = styled.span<{ $isAI?: boolean }>`
  display: flex;
  align-items: center;
  margin-bottom: 0.6rem;

  svg {
    width: 18px;
    height: 18px;
    color: ${({ $isAI }) => ($isAI ? '#534ab7' : '#666687')};
  }
`;

// ---------------------------------------------------------------------------
// Feature definitions
// ---------------------------------------------------------------------------

const FEATURES: Feature[] = [
  {
    icon: <Translate />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.aiTranslations.title',
    titleDefault: 'AI Translations',
    descId: 'app.components.FreeTrialWelcomeModal.feature.aiTranslations.desc',
    descDefault: 'Auto-translate content across locales instantly',
    isAI: true,
  },
  {
    icon: <Picture />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.aiMediaLibrary.title',
    titleDefault: 'AI Media Library',
    descId: 'app.components.FreeTrialWelcomeModal.feature.aiMediaLibrary.desc',
    descDefault: 'Smart tagging and search for your assets',
    isAI: true,
  },
  {
    icon: <Layer />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.aiContentTypeBuilder.title',
    titleDefault: 'AI Content-Type Builder',
    descId: 'app.components.FreeTrialWelcomeModal.feature.aiContentTypeBuilder.desc',
    descDefault: 'Generate schemas from a text description',
    isAI: true,
  },
  {
    icon: <Eye />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.livePreview.title',
    titleDefault: 'Live Preview',
    descId: 'app.components.FreeTrialWelcomeModal.feature.livePreview.desc',
    descDefault: 'See changes in real time before publishing',
  },
  {
    icon: <Calendar />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.releases.title',
    titleDefault: 'Releases',
    descId: 'app.components.FreeTrialWelcomeModal.feature.releases.desc',
    descDefault: 'Schedule and coordinate content publishing',
  },
  {
    icon: <Calendar />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.contentHistory.title',
    titleDefault: 'Content History',
    descId: 'app.components.FreeTrialWelcomeModal.feature.contentHistory.desc',
    descDefault: 'Browse and restore previous content versions',
  },
  {
    icon: <Key />,
    titleId: 'app.components.FreeTrialWelcomeModal.feature.sso.title',
    titleDefault: 'SSO — Single Sign-On',
    descId: 'app.components.FreeTrialWelcomeModal.feature.sso.desc',
    descDefault: 'Let your team log in with Google, Okta, or any SAML provider',
    fullWidth: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FreeTrialWelcomeModal = ({ onClose }: FreeTrialWelcomeModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Content style={{ maxWidth: '560px', overflow: 'hidden' }}>
        {/* Gradient header — custom styled, not a DS Modal.Header */}
        <ModalHeader direction="column" alignItems="flex-start">
          <TrialBadge>
            {formatMessage({
              id: 'app.components.FreeTrialWelcomeModal.badge',
              defaultMessage: '30-DAY FREE TRIAL',
            })}
          </TrialBadge>

          <Typography
            variant="alpha"
            style={{ color: '#fff', marginBottom: '0.4rem' }}
          >
            {formatMessage({
              id: 'app.components.FreeTrialWelcomeModal.title',
              defaultMessage: 'Your Growth trial has started! 🎉',
            })}
          </Typography>

          <Typography variant="epsilon" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {formatMessage({
              id: 'app.components.FreeTrialWelcomeModal.subtitle',
              defaultMessage:
                'Unlock the full power of Strapi for 30 days — no credit card needed.',
            })}
          </Typography>
        </ModalHeader>

        <Modal.Body>
          <Flex direction="column" gap={4} alignItems="stretch">
            {/* Section label */}
            <Typography
              variant="sigma"
              style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
              textColor="neutral500"
            >
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.sectionLabel',
                defaultMessage: 'Included in your trial',
              })}
            </Typography>

            {/* Feature grid */}
            <FeatureGrid>
              {FEATURES.map((feature) => (
                <FeatureCard
                  key={feature.titleId}
                  $isAI={feature.isAI}
                  $fullWidth={feature.fullWidth}
                >
                  {feature.fullWidth ? (
                    // SSO: horizontal layout
                    <Flex gap={3} alignItems="center">
                      <IconWrapper $isAI={feature.isAI}>{feature.icon}</IconWrapper>
                      <div>
                        <Typography
                          variant="pi"
                          fontWeight="bold"
                          style={{
                            color: feature.isAI ? '#3c3489' : undefined,
                            display: 'block',
                            marginBottom: '0.2rem',
                          }}
                          textColor={feature.isAI ? undefined : 'neutral800'}
                        >
                          {formatMessage({
                            id: feature.titleId,
                            defaultMessage: feature.titleDefault,
                          })}
                        </Typography>
                        <Typography
                          variant="pi"
                          style={{ color: feature.isAI ? '#534ab7' : undefined }}
                          textColor={feature.isAI ? undefined : 'neutral600'}
                        >
                          {formatMessage({
                            id: feature.descId,
                            defaultMessage: feature.descDefault,
                          })}
                        </Typography>
                      </div>
                    </Flex>
                  ) : (
                    // Standard card: vertical layout
                    <>
                      <IconWrapper $isAI={feature.isAI}>{feature.icon}</IconWrapper>
                      <Typography
                        variant="pi"
                        fontWeight="bold"
                        style={{
                          color: feature.isAI ? '#3c3489' : undefined,
                          display: 'block',
                          marginBottom: '0.2rem',
                        }}
                        textColor={feature.isAI ? undefined : 'neutral800'}
                      >
                        {formatMessage({
                          id: feature.titleId,
                          defaultMessage: feature.titleDefault,
                        })}
                      </Typography>
                      <Typography
                        variant="pi"
                        style={{ color: feature.isAI ? '#534ab7' : undefined }}
                        textColor={feature.isAI ? undefined : 'neutral600'}
                      >
                        {formatMessage({
                          id: feature.descId,
                          defaultMessage: feature.descDefault,
                        })}
                      </Typography>
                    </>
                  )}
                </FeatureCard>
              ))}
            </FeatureGrid>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Flex justifyContent="space-between" alignItems="center" width="100%">
            <Typography variant="pi" textColor="neutral500">
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.footer',
                defaultMessage: '30 days free · No credit card required',
              })}
            </Typography>
            <Button onClick={onClose} size="L">
              {formatMessage({
                id: 'app.components.FreeTrialWelcomeModal.button',
                defaultMessage: 'Start exploring',
              })}
            </Button>
          </Flex>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
};

export { FreeTrialWelcomeModal };
