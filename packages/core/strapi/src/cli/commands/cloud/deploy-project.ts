import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import type { CLIContext, StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { apiConfig } from './config/api';
import { getStoragePath } from './config/local';
import { action as createProjectAction } from './create-project';
import { cloudApiFactory, ProjectInfos } from './services/cli-api';
import * as localSave from './services/strapi-info-save';
import { compressFilesToTar } from './utils/compress-files';
import { notificationServiceFactory } from './utils/notification-service';
import { tokenServiceFactory } from './utils/token';
import { loadPkg } from '../../utils/pkg';

type PackageJson = {
  strapi?: {
    uuid?: string;
  };
};

const FILE_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

async function upload(ctx: CLIContext, project: ProjectInfos, token: string) {
  const cloudApi = cloudApiFactory(token);
  try {
    const storagePath = getStoragePath();
    const projectFolder = path.resolve(process.cwd());
    const packageJson: PackageJson = await loadPkg(ctx);

    if (!packageJson) {
      ctx.logger.error(
        'Unable to deploy the project. Please make sure the package.json file is correctly formatted.'
      );
      return;
    }
    if (!packageJson.strapi || !packageJson.strapi.uuid) {
      ctx.logger.error(
        'The project is not a Strapi project. Please make sure the package.json file is correctly formatted. It should contain a `strapi` object with a `uuid` property.'
      );
      return;
    }

    ctx.logger.log('📦 Compressing project...');
    const compressedFilename = `${packageJson.strapi.uuid}.tar.gz`;
    try {
      await compressFilesToTar(storagePath, projectFolder, compressedFilename);
      ctx.logger.log('📦 Project compressed successfully!');
    } catch (error: unknown) {
      ctx.logger.error(
        '⚠️ Project compression failed. Try again later or check for large/incompatible files.'
      );
      ctx.logger.debug(error);
    }

    const tarFilePath = path.resolve(storagePath, compressedFilename);
    const fileStats = fs.statSync(tarFilePath);

    if (fileStats.size > FILE_SIZE_LIMIT) {
      return ctx.logger.log(
        'Unable to proceed: Your project is too big to be transferred, please use a git repo instead.'
      );
    }

    ctx.logger.info('🚀 Uploading project...');
    const progressBar = ctx.logger.progressBar(100, 'Upload Progress');

    try {
      await cloudApi.deploy(
        { filePath: tarFilePath, project },
        {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || fileStats.size;
            const percentage = Math.round((progressEvent.loaded * 100) / total);
            progressBar.update(percentage);
          },
        }
      );
      progressBar.update(100);
      progressBar.stop();
      ctx.logger.success('✨ Upload finished!');
    } catch (error: any) {
      progressBar.stop();
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      ctx.logger.debug(error);
    }
    process.exit(0);
  } catch (error: any) {
    ctx.logger.error('An error occurred while deploying the project. Please try again later.');
    ctx.logger.debug(error);
    process.exit(1);
  }
}

async function getProject(ctx: CLIContext) {
  const { project } = localSave.retrieve();
  if (!project) {
    return createProjectAction(ctx)();
  }
  return project;
}

const action = (ctx: CLIContext) => async () => {
  const { getValidToken } = tokenServiceFactory(ctx);
  const token = await getValidToken();

  if (!token) {
    return;
  }

  const project = await getProject(ctx);

  if (!project) {
    return;
  }

  const notificationService = notificationServiceFactory(ctx);
  await upload(ctx, project, token);
  await notificationService(`${apiConfig.apiBaseUrl}/notifications`, token);
  return;
};

/**
 * `$ deploy project to the cloud`
 */

const command: StrapiCommand = ({ ctx }) => {
  return createCommand('cloud:deploy')
    .alias('deploy')
    .description('Deploy a Strapi Cloud project')
    .action(runAction('deploy', action(ctx)));
};

export { action, command };
