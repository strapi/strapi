import axios from 'axios';
import packageJSON from '../../../../../package.json';

const strapiVersion = packageJSON.version;

const fetchStrapiLatestRelease = async () => {
  try {
    const {
      data: { tag_name },
    } = await axios.get('https://api.github.com/repos/strapi/strapi/releases/latest');

    return tag_name;
  } catch (err) {
    // Don't throw an error
    return strapiVersion;
  }
};

export default fetchStrapiLatestRelease;
