import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';
import * as swStats from 'swagger-stats';
import * as requestIp from 'request-ip';
import * as compression from 'compression';
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

async function bootstrap() {
  Logger.log(
    `🥙 Application (${process.env.npm_package_name}@v${process.env.npm_package_version})`,
    'NestJS',
  );

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // app.set('query parser', 'extended');
  // app.set('trust proxy', true); // ?

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${xEnv.APP_NAME} API`)
    .setDescription(`This documentation describes the ${xEnv.APP_NAME} API.`)
    .setVersion(process.env.npm_package_version)
    .addTag('schedule', 'YSTU Schedule')
    .addTag('calendar', 'YSTU Calendar')
    .addServer(`${xEnv.OAUTH_URL}`, 'Main oAuth Server (for get token)')
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          clientCredentials: {
            scopes: {
              'schedule:read': 'Read Schedule',
              'schedule:advanced:read': 'Read Advanced Schedule',
              'schedule:nolimit': 'No rate limits',
            },
            tokenUrl: '/access_token',
            refreshUrl: '/access_token',
          },
        },
      },
      'oauth2',
    )
    .addApiKey({ type: 'apiKey', in: 'query' }, 'access_token')
    .addBearerAuth({ type: 'http', bearerFormat: 'Bearer' }, 'bearer');

  if (xEnv.NODE_ENV === xEnv.EnvType.DEV) {
    swaggerConfig.addServer(`http://{host}:{port}`, 'API local dev', {
      host: {
        default: 'localhost',
        enum: ['localhost', '127.0.0.1', '[::1]'],
      },
      port: {
        default: String(xEnv.EXTERNAL_PORT),
        enum: [...new Set([xEnv.EXTERNAL_PORT, xEnv.SERVER_PORT].map(String))],
      },
    });
  }
  swaggerConfig.addServer(
    `${xEnv.SERVER_URL}`,
    'Main API Server (for main requests)',
  );

  const swaggerSpec = SwaggerModule.createDocument(app, swaggerConfig.build(), {
    extraModels: [],
  });
  SwaggerModule.setup('swagger', app, swaggerSpec, {});

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
process.on('uncaughtException', (error: Error, origin: string) => {
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
