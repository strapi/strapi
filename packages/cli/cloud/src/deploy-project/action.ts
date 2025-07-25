import fse from 'fs-extra';
import inquirer from 'inquirer';
import boxen from 'boxen';
import path from 'path';
import chalk from 'chalk';
import { AxiosError } from 'axios';
import * as crypto from 'node:crypto';
import { apiConfig } from '../config/api';
import { compressFilesToTar } from '../utils/compress-files';
import createProjectAction from '../create-project/action';
import type {
  CLIContext,
  CloudApiService,
  CloudCliConfig,
  EnvironmentDetails,
  ProjectInfo,
} from '../types';
import { getTmpStoragePath } from '../config/local';
import { cloudApiFactory, tokenServiceFactory, local } from '../services';
import { VERSION } from '../services/cli-api';
import { notificationServiceFactory } from '../services/notification';
import { loadPkg } from '../utils/pkg';
import { buildLogsServiceFactory } from '../services/build-logs';
import { promptLogin } from '../login/action';
import { trackEvent } from '../utils/analytics';
import {
  environmentCreationErrorFactory,
  environmentErrorMessageFactory,
} from '../utils/error-message-factories';

type PackageJson = {
  name: string;
  strapi?: {
    uuid: string;
  };
};

interface CmdOptions {
  env?: string;
  force?: boolean;
}

const boxenOptions: boxen.Options = {
  padding: 1,
  margin: 1,
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round',
};

const QUIT_OPTION = 'Quit';

async function promptForEnvironment(environments: string[]): Promise<string> {
  const choices = environments.map((env) => ({ name: env, value: env }));
  const { selectedEnvironment } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedEnvironment',
      message: 'Select the environment to deploy:',
      choices: [...choices, { name: chalk.grey(`(${QUIT_OPTION})`), value: null }],
    },
  ]);
  if (selectedEnvironment === null) {
    process.exit(1);
  }

  return selectedEnvironment;
}

async function upload(
  ctx: CLIContext,
  project: Omit<ProjectInfo, 'id'>,
  cliConfig: CloudCliConfig,
  token: string,
  maxProjectFileSize: number
) {
  const cloudApi = await cloudApiFactory(ctx, token);
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

    const compressSpinner = ctx.logger.spinner('Compressing project...').start();
    compressSpinner.indent = 1;
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
      compressSpinner.succeed(`Project compressed successfully!`);
    } catch (e: unknown) {
      compressSpinner.fail(
        'Project compression failed. Try again later or check for large/incompatible files.'
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

    const progressBar = ctx.logger.progressBar(100, ' ∷ Uploading project');

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
      ctx.logger.log(`${chalk.green.bold('✔')} Upload finished!\n`);
      return data.build_id;
    } catch (e: any) {
      progressBar.stop();
      await handleUploadError(ctx, e, project, cliConfig);
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

async function handleUploadError(
  ctx: CLIContext,
  error: any,
  project: any,
  cliConfig: CloudCliConfig
) {
  const { logger } = ctx;
  logger.debug(error);

  if (error.response?.status) {
    switch (error.response.status) {
      case 405: {
        const environmentErrorMessage = environmentErrorMessageFactory({
          projectName: project.name,
          firstLine: cliConfig.projectDeployment.errors.environmentNotReady.firstLine,
          secondLine: cliConfig.projectDeployment.errors.environmentNotReady.secondLine,
        });
        logger.log(environmentCreationErrorFactory(environmentErrorMessage));
        return;
      }
      case 413:
        logger.error(
          'The project you are trying to upload is too big. Please remove unnecessary files and try again.'
        );
        return;
      default:
        break;
    }
  }
  logger.error('An error occurred while deploying the project. Please try again later.');
}

async function getProject(ctx: CLIContext) {
  const { project } = await local.retrieve();
  if (!project) {
    try {
      const projectResponse = await createProjectAction(ctx);
      if (projectResponse) {
        const { project: projectSaved } = await local.retrieve();
        return projectSaved;
      }
    } catch (e: any) {
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
      ctx.logger.debug(e);
      process.exit(1);
    }
  }
  return project;
}

async function getConfig({
  ctx,
  cloudApiService,
}: {
  ctx: CLIContext;
  cloudApiService: CloudApiService;
}): Promise<CloudCliConfig | null> {
  try {
    const { data: cliConfig } = await cloudApiService.config();
    return cliConfig;
  } catch (e) {
    ctx.logger.debug('Failed to get cli config', e);
    return null;
  }
}

function validateEnvironment(ctx: CLIContext, environment: string, environments: string[]): void {
  if (!environments.includes(environment)) {
    ctx.logger.error(`Environment ${environment} does not exist.`);
    process.exit(1);
  }
}

async function getTargetEnvironment(
  ctx: CLIContext,
  opts: CmdOptions,
  project: Omit<ProjectInfo, 'id'>,
  environments: string[]
): Promise<string> {
  if (opts.env) {
    validateEnvironment(ctx, opts.env, environments);
    return opts.env;
  }

  if (project.targetEnvironment) {
    return project.targetEnvironment;
  }

  if (environments.length > 1) {
    return promptForEnvironment(environments);
  }

  return environments[0];
}

function hasPendingOrLiveDeployment(
  environments: EnvironmentDetails[],
  targetEnvironment: string
): boolean {
  const environment = environments.find((env) => env.name === targetEnvironment);
  if (!environment) {
    throw new Error(`Environment details ${targetEnvironment} not found.`);
  }
  return environment.hasPendingDeployment || environment.hasLiveDeployment || false;
}

export default async (ctx: CLIContext, opts: CmdOptions) => {
  const { getValidToken } = await tokenServiceFactory(ctx);
  const token = await getValidToken(ctx, promptLogin);
  if (!token) {
    return;
  }

  const project = await getProject(ctx);
  if (!project) {
    process.exit(1);
  }

  const cloudApiService = await cloudApiFactory(ctx, token);
  let projectData;
  let environments: string[];
  let environmentsDetails: EnvironmentDetails[];

  try {
    const {
      data: { data, metadata },
    } = await cloudApiService.getProject({ name: project.name });
    projectData = data;
    environments = projectData.environments;
    environmentsDetails = projectData.environmentsDetails;
    const isProjectSuspended = projectData.suspendedAt;

    if (isProjectSuspended) {
      ctx.logger.log(
        '\n Oops! This project has been suspended. \n\n Please reactivate it from the dashboard to continue deploying: '
      );
      ctx.logger.log(chalk.underline(`${metadata.dashboardUrls.project}`));
      return;
    }
  } catch (e: Error | unknown) {
    if (e instanceof AxiosError && e.response?.data) {
      if (e.response.status === 404) {
        ctx.logger.warn(
          `The project associated with this folder does not exist in Strapi Cloud. \nPlease link your local project to an existing Strapi Cloud project using the ${chalk.cyan(
            'link'
          )} command before deploying.`
        );
      } else {
        ctx.logger.error(e.response.data);
      }
    } else {
      ctx.logger.error(
        "An error occurred while retrieving the project's information. Please try again later."
      );
    }
    ctx.logger.debug(e);
    return;
  }

  await trackEvent(ctx, cloudApiService, 'willDeployWithCLI', {
    projectInternalName: project.name,
  });

  const notificationService = notificationServiceFactory(ctx);
  const buildLogsService = buildLogsServiceFactory(ctx);

  const cliConfig = await getConfig({ ctx, cloudApiService });
  if (!cliConfig) {
    ctx.logger.error(
      'An error occurred while retrieving data from Strapi Cloud. Please check your network or try again later.'
    );
    return;
  }

  let maxSize: number = parseInt(cliConfig.maxProjectFileSize, 10);
  if (Number.isNaN(maxSize)) {
    ctx.logger.debug(
      'An error occurred while parsing the maxProjectFileSize. Using default value.'
    );
    maxSize = 100000000;
  }

  project.targetEnvironment = await getTargetEnvironment(ctx, opts, project, environments);

  if (!opts.force) {
    const shouldDisplayWarning = hasPendingOrLiveDeployment(
      environmentsDetails,
      project.targetEnvironment
    );
    if (shouldDisplayWarning) {
      ctx.logger.log(boxen(cliConfig.projectDeployment.confirmationText, boxenOptions));
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Do you want to proceed with deployment to ${chalk.cyan(projectData.displayName)} on ${chalk.cyan(project.targetEnvironment)} environment?`,
        },
      ]);
      if (!confirm) {
        process.exit(1);
      }
    }
  }

  const buildId = await upload(ctx, project, cliConfig, token, maxSize);

  if (!buildId) {
    return;
  }

  let notifications: ReturnType<typeof notificationService> | null = null;

  try {
    ctx.logger.log(
      `∷ Deploying project to ${chalk.cyan(project.targetEnvironment ?? `production`)} environment...`
    );

    notifications = notificationService(
      `${apiConfig.apiBaseUrl}/${VERSION}/notifications`,
      token,
      cliConfig
    );

    await buildLogsService(`${apiConfig.apiBaseUrl}/${VERSION}/logs/${buildId}`, token, cliConfig);
    const dashboardUrlLine =
      chalk.cyan(' →  ') +
      chalk.cyan.underline(`${apiConfig.dashboardBaseUrl}/projects/${project.name}/deployments`);
    ctx.logger.log(
      boxen(`Project and deployment logs ready at:\n${dashboardUrlLine}`, {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'white',
        titleAlignment: 'left',
      })
    );
  } catch (e: Error | unknown) {
    ctx.logger.debug(e);
    if (e instanceof Error) {
      ctx.logger.error(e.message);
    } else {
      ctx.logger.error('An error occurred while deploying the project. Please try again later.');
    }
  } finally {
    if (notifications) {
      notifications.close();
    }
  }
};
