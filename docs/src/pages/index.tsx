import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';

import {
  PACKAGE_MAP_PATH,
  getPackageSections,
  isPackageDocumented,
  useWorkspacePackages,
} from '@site/src/lib/workspace-packages';

import styles from './index.module.css';

const START_CONTRIBUTING_PATH = '/contributing';

const SECTIONS: Array<{ title: string; description: string; to: string }> = [
  {
    title: 'Contributing',
    description: 'How-to guides: set up the monorepo, test changes and keep the docs healthy.',
    to: START_CONTRIBUTING_PATH,
  },
  {
    title: 'Architecture',
    description: 'How the packages fit together: lifecycle, registries, extension points.',
    to: '/architecture',
  },
  {
    title: 'Packages',
    description: 'One page per workspace package, at the same path as in the repository.',
    to: '/packages',
  },
  {
    title: 'API reference',
    description: 'The Strapi class and the core APIs it exposes.',
    to: '/api/Strapi',
  },
];

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className="container">
        <p className={styles.eyebrow}>strapi/strapi</p>
        <Heading as="h1" className={styles.title}>
          Strapi contributor docs
        </Heading>
        <p className={styles.subtitle}>
          How the Strapi monorepo is built, package by package, and how to contribute to it.
        </p>
        <div className={styles.actions}>
          <Link className="button button--primary button--lg" to={START_CONTRIBUTING_PATH}>
            Start contributing
          </Link>
          <Link className="button button--secondary button--lg" to="/packages">
            Explore packages
          </Link>
        </div>
      </div>
    </header>
  );
}

function SectionCards(): ReactNode {
  return (
    <section className={styles.cards} aria-label="Sections">
      {SECTIONS.map((section) => (
        <Link key={section.title} className={styles.card} to={section.to}>
          <Heading as="h2" className={styles.cardTitle}>
            {section.title}
            <span className={styles.cardArrow} aria-hidden="true">
              →
            </span>
          </Heading>
          <p className={styles.cardDescription}>{section.description}</p>
        </Link>
      ))}
    </section>
  );
}

function PackageMapTeaser(): ReactNode {
  const data = useWorkspacePackages();
  const prodEdgeCount = data.edges.filter((edge) => edge.kind === 'prod').length;
  const documentedCount = data.packages.filter(
    (pkg) => isPackageDocumented(data, pkg.name) === true
  ).length;

  return (
    <section className={styles.teaser}>
      <div>
        <Heading as="h2" className={styles.teaserTitle}>
          Package map
        </Heading>
        <p className={styles.stats}>
          <strong>{data.packages.length}</strong> packages · <strong>{prodEdgeCount}</strong>{' '}
          internal dependencies · <strong>{documentedCount}</strong> documented
        </p>
        <Link className={styles.teaserLink} to={PACKAGE_MAP_PATH}>
          Open the package map →
        </Link>
      </div>
      <ul className={styles.groups} aria-label="Packages by group">
        {getPackageSections(data).map(({ group, packages }) => (
          <li key={group.id} data-pkg-group={group.id}>
            <span className={styles.swatch} aria-hidden="true" />
            {group.label}
            <span className={styles.groupCount}>{packages.length}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout description="How the Strapi monorepo is built, package by package, and how to contribute to it.">
      <Hero />
      <main className={`container ${styles.main}`}>
        <SectionCards />
        <PackageMapTeaser />
        <p className={styles.agents}>
          <strong>Agents:</strong> an index of this site is available at{' '}
          <Link to="pathname:///llms.txt">/llms.txt</Link>, the full content at{' '}
          <Link to="pathname:///llms-full.txt">/llms-full.txt</Link>.
        </p>
      </main>
    </Layout>
  );
}
