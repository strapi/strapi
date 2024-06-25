import fse from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { AxiosError } from 'axios';
import * as crypto from 'node:crypto';
import { apiConfig } from '../config/api';
import { compressFilesToTar } from '../utils/compress-files';
import createProjectAction from '../create-project/action';
import type { CLIContext, ProjectInfos } from '../types';
import { getTmpStoragePath } from '../config/local';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { notificationServiceFactory } from '../services/notification';
import { loadPkg } from '../utils/pkg';
import { buildLogsServiceFactory } from '../services/build-logs';

type PackageJson = {
  name: string;
  strapi?: {
    uuid: string;
  };
};

async function upload(
  ctx: CLIContext,
  project: ProjectInfos,
  token: string,
  maxProjectFileSize: number
) {
  const cloudApi = await cloudApiFactory(ctx, token);
  // * Upload project
  try {
    const storagePath = await getTmpStoragePath();
    const projectFolder = path.resolve(process.cwd());
    const packageJson = (await loadPkg(ctx)) as PackageJson;

    if (!packageJson) {
      ctx.logger.error(
        'Unable to deploy the project. Please make sure the package.json file is correctly formatted.'
      );
      return;
    }

    ctx.logger.log('📦 Compressing project...');
    // hash packageJson.name to avoid conflicts
    const hashname = crypto.createHash('sha512').update(packageJson.name).digest('hex');
    const compressedFilename = `${hashname}.tar.gz`;
    try {
      ctx.logger.debug(
        'Compression parameters\n',
        `Storage path: ${storagePath}\n`,
        `Project folder: ${projectFolder}\n`,
        `Compressed filename: ${compressedFilename}`
      );
      await compressFilesToTar(storagePath, projectFolder, compressedFilename);
      ctx.logger.log('📦 Project compressed successfully!');
    } catch (e: unknown) {
      ctx.logger.error(
        '⚠️ Project compression failed. Try again later or check for large/incompatible files.'
      );
      ctx.logger.debug(e);
      process.exit(1);
    }

    const tarFilePath = path.resolve(storagePath, compressedFilename);
    const fileStats = await fse.stat(tarFilePath);

    if (fileStats.size > maxProjectFileSize) {
      ctx.logger.log(
        'Unable to proceed: Your project is too big to be transferred, please use a git repo instead.'
      );
      try {
        await fse.remove(tarFilePath);
      } catch (e: any) {
        ctx.logger.log('Unable to remove file: ', tarFilePath);
        ctx.logger.debug(e);
      }
      return;
    }

    ctx.logger.info('🚀 Uploading project...');
    const progressBar = ctx.logger.progressBar(100, 'Upload Progress');

    try {
      const { data } = await cloudApi.deploy(
        { filePath: tarFilePath, project },
        {
          onUploadProgress(progressEvent) {
            const total = progressEvent.total || fileStats.size;
            const percentage = Math.round((progressEvent.loaded * 100) / total);
            progressBar.update(percentage);
          },
        }
      );

      progressBar.update(100);
      progressBar.stop();
      ctx.logger.success('✨ Upload finished!');
      return data.build_id;
    } catch (e: any) {
      progressBar.stop();
      if (e instanceof AxiosError && e.response?.data) {
        if (e.response.status === 404) {
          ctx.logger.error(
            `The project does not exist. Remove the ${local.LOCAL_SAVE_FILENAME} file and try again.`
          );
        } else {
          ctx.logger.error(e.response.data);
        }
      } else {
        ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      }

      ctx.logger.debug(e);
    } finally {
      await fse.remove(tarFilePath);
    }
    process.exit(0);
  } catch (e: any) {
    ctx.logger.error('An error occurred while deploying the project. Please try again later.');
    ctx.logger.debug(e);
    process.exit(1);
  }
}

async function getProject(ctx: CLIContext) {
  const { project } = await local.retrieve();
  if (!project) {
    try {
      return await createProjectAction(ctx);
    } catch (e: any) {
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      ctx.logger.debug(e);
      process.exit(1);
    }
  }
  return project;
}

export default async (ctx: CLIContext) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const cloudApiService = await cloudApiFactory(ctx);
  const token = await getValidToken();

  if (!token) {
    return;
  }

  const project = await getProject(ctx);

  if (!project) {
    return;
  }

  try {
    await cloudApiService.track('willDeployWithCLI', { projectInternalName: project.name });
  } catch (e) {
    ctx.logger.debug('Failed to track willDeploy', e);
  }

  const notificationService = notificationServiceFactory(ctx);
  const buildLogsService = buildLogsServiceFactory(ctx);

  const { data: cliConfig } = await cloudApiService.config();

  let maxSize: number = parseInt(cliConfig.maxProjectFileSize, 10);
  if (Number.isNaN(maxSize)) {
    ctx.logger.debug(
      'An error occurred while parsing the maxProjectFileSize. Using default value.'
    );
    maxSize = 100000000;
  }

  const buildId = await upload(ctx, project, token, maxSize);

  if (!buildId) {
    return;
  }

  try {
    notificationService(`${apiConfig.apiBaseUrl}/notifications`, token, cliConfig);
    await buildLogsService(`${apiConfig.apiBaseUrl}/v1/logs/${buildId}`, token, cliConfig);

    ctx.logger.log(
      'Visit the following URL for deployment logs. Your deployment will be available here shortly.'
    );
    ctx.logger.log(
      chalk.underline(`${apiConfig.dashboardBaseUrl}/projects/${project.name}/deployments`)
    );
  } catch (e: Error | unknown) {
    if (e instanceof Error) {
      ctx.logger.error(e.message);
    } else {
      throw e;
    }
  }
};
