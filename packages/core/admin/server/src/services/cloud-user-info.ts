import fs from 'fs';

interface CloudUserInfo {
  email?: string;
}

const CLOUD_USER_INFO_FILE = '.strapi-cloud-user-info.json';

/**
 * Saves cloud user info to a temporary file
 */
const saveCloudUserInfo = (userInfo: CloudUserInfo): boolean => {
  try {
    fs.writeFileSync(CLOUD_USER_INFO_FILE, JSON.stringify(userInfo), 'utf8');

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Loads cloud user info from the temporary file
 */
const loadCloudUserInfo = (): CloudUserInfo | null => {
  try {
    if (!fs.existsSync(CLOUD_USER_INFO_FILE)) {
      return null;
    }

    const fileContent = fs.readFileSync(CLOUD_USER_INFO_FILE, 'utf8');
    const userInfo = JSON.parse(fileContent);

    return userInfo;
  } catch (error) {
    return null;
  }
};

/**
 * Deletes the cloud user info file
 * NOTE: This should be called after the first admin is created
 */
const deleteCloudUserInfo = (): boolean => {
  try {
    if (!fs.existsSync(CLOUD_USER_INFO_FILE)) {
      return false;
    }

    fs.unlinkSync(CLOUD_USER_INFO_FILE);
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  saveCloudUserInfo,
  loadCloudUserInfo,
  deleteCloudUserInfo,
};
