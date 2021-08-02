import React from 'react';
import Wrapper from './Wrapper';
import LogoStrapi from '../../../assets/images/banner_strapi-rocket.png';

const PluginBanner = () => {
  return (
    <Wrapper>
      <img className="bannerImage" src={LogoStrapi} alt="A strapi rocket logo" />
      <div>
        <div>
          Discover plugins built by the community, and many more awesome things to kickstart your
          project, on Strapi Awesome
        </div>
        <a
          href="https://github.com/strapi/awesome-strapi"
          target="_blank"
          rel="noopener noreferrer"
          className="bannerLink"
        >
          Check it out now
          <i className="fa fa-external-link-alt" />
        </a>
      </div>
    </Wrapper>
  );
};

export default PluginBanner;
