import { getFetchClient } from '@strapi/helper-plugin';
import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;
const { get } = getFetchClient();

const fetchStrapiLatestRelease = async () => {
  try {
    const {
      data: { tag_name },
    } = await get('https://api.github.com/repos/strapi/strapi/releases/latest', {
      headers: {
        Authorization: ''
      }
    });

    return tag_name;
  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

export default fetchStrapiLatestRelease;
