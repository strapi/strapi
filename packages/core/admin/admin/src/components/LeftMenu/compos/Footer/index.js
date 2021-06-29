/**
 *
 * LeftMenuFooter
 *
 */

import React from 'react';

import { useAppInfos } from '@strapi/helper-plugin';
import Wrapper, { A } from './Wrapper';

function LeftMenuFooter() {
  const projectType = process.env.STRAPI_ADMIN_PROJECT_TYPE;
  const { strapiVersion } = useAppInfos();

  return (
    <Wrapper>
      <div className="poweredBy">
        <A key="website" href="https://strapi.io" target="_blank" rel="noopener noreferrer">
          Strapi
        </A>
        &nbsp;
        <A
          href={`https://github.com/strapi/strapi/releases/tag/v${strapiVersion}`}
          key="github"
          target="_blank"
          rel="noopener noreferrer"
        >
          v{strapiVersion}
        </A>
        &nbsp;
        <A href="https://strapi.io" target="_blank" rel="noopener noreferrer">
          — {projectType} Edition
        </A>
      </div>
    </Wrapper>
  );
}

export default LeftMenuFooter;
