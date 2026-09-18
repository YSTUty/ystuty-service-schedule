import { Logger, VersioningType } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';

import * as compression from 'compression';
import * as basicAuth from 'express-basic-auth';
import * as requestIp from 'request-ip';
import * as swStats from 'swagger-stats';
import { apiReference } from '@scalar/nestjs-api-reference';
import { HtmlRenderingConfiguration } from '@scalar/types/dist/api-reference';
import helmet from 'helmet';

import * as xEnv from '@my-environment';

import {
  HttpAndRpcExceptionFilter,
  OnlyDevGuard,
  ValidationHttpPipe,
} from '@my-common';

import { AppModule } from './models/app/app.module';
import { createOpenApiDocument } from './models/app/openapi';

async function bootstrap() {
  Logger.log(
    `🥙 Application (${process.env.npm_package_name}@v${process.env.npm_package_version})`,
    'NestJS',
  );

  xEnv.assertRequiredEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // app.set('query parser', 'extended');
  if (xEnv.TRUSTED_PROXY_IPS.length) {
    // Не доверяем X-Forwarded-* при прямых запросах из Docker-сети.
    app.set('trust proxy', xEnv.TRUSTED_PROXY_IPS);
  }

  // app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    // defaultVersion: '1',
  });

  app.enableShutdownHooks();
  app.enableCors({
    allowedHeaders: ['content-type', 'authorization'],
    exposedHeaders: [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'retry-after',
    ],
  });

  // app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalGuards(new OnlyDevGuard());
  app.useGlobalPipes(
    new ValidationHttpPipe({
      transform: true,
      // whitelist: true,
      // forbidNonWhitelisted: false,
      // transformOptions: {
      //   // groups: [FOR_SYS],
      //   enableImplicitConversion: true,
      //   // enableCircularCheck: true,
      // },
    }),
  );
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpAndRpcExceptionFilter(httpAdapterHost));

  app.use(compression());
  app.use(
    helmet({
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false,
      // crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(requestIp.mw({ attributeName: 'ip' }));

  const pathToReference = '/reference';
  if (xEnv.SWAGGER_ACCESS_USERNAME) {
    if (xEnv.SWAGGER_ACCESS_PASSWORD) {
      app.use(
        [pathToReference, '/swagger', '/swagger-json'],
        basicAuth({
          challenge: true,
          users: {
            [xEnv.SWAGGER_ACCESS_USERNAME]: xEnv.SWAGGER_ACCESS_PASSWORD,
          },
        }),
      );
    }
    if (xEnv.SWAGGER_ACCESS_PASSWORD_STATS || xEnv.SWAGGER_ACCESS_PASSWORD) {
      app.use(
        ['/swagger-stats'],
        basicAuth({
          challenge: true,
          users: {
            [xEnv.SWAGGER_ACCESS_USERNAME]:
              xEnv.SWAGGER_ACCESS_PASSWORD_STATS ||
              xEnv.SWAGGER_ACCESS_PASSWORD,
          },
        }),
      );
    }
  }

  const swaggerSpec = createOpenApiDocument(app);
  SwaggerModule.setup('swagger', app, swaggerSpec, {
    swaggerOptions: {
      displayOperationId: true,
      filter: true,
      persistAuthorization: true,
    },
  });

  // TODO!: отключил статистику (`swaggerOnly: true`) пока не пофикшена утечка роутов в swagger-stats
  app.use(swStats.getMiddleware({ swaggerSpec, swaggerOnly: true }));
  app.use(
    pathToReference,
    apiReference({
      content: swaggerSpec,
      telemetry: false,
      _integration: 'react', // 'nestjs'
      showToolbar: 'never',
      theme: 'deepSpace',
      pageTitle: `${xEnv.APP_NAME} API Reference`,
    } as Partial<HtmlRenderingConfiguration>),
  );

  await app.startAllMicroservices();
  await app.listen(xEnv.SERVER_PORT);

  if (xEnv.NODE_ENV !== xEnv.EnvType.PROD) {
    Logger.log(
      `🤬  Application is running on: ${await app.getUrl()}`,
      'NestJS',
    );
  }
  Logger.log(
    `🚀  Server is listening on port ${xEnv.SERVER_PORT}`,
    'Bootstrap',
  );
}

const logger = new Logger('GlobalErrorHandler');
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error.stack);
});
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error(
    `Unhandled Rejection at: ${promise}, reason: ${reason?.message || reason}`,
    reason?.stack,
  );
});

bootstrap().catch((e) => {
  Logger.warn(`❌  Error starting server, ${e}`, 'Bootstrap');
  throw e;
});
