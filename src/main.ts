import { NestFactory } from '@nestjs/core';
import { Logger, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as basicAuth from 'express-basic-auth';
import * as swStats from 'swagger-stats';
import * as requestIp from 'request-ip';
import * as compression from 'compression';
import helmet from 'helmet';

import * as xEnv from '@my-environment';
import {
  HttpAndRpcExceptionFilter,
  OnlyDevGuard,
  ValidationHttpPipe,
} from '@my-common';

import { AppModule } from './models/app/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
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

  app.useGlobalGuards(new OnlyDevGuard());
  app.useGlobalPipes(new ValidationHttpPipe({ transform: true }));
  app.useGlobalFilters(new HttpAndRpcExceptionFilter());

  app.use(compression());
  app.use(
    helmet({
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.use(requestIp.mw({ attributeName: 'ip' }));

  if (xEnv.SWAGGER_ACCESS_USERNAME) {
    if (xEnv.SWAGGER_ACCESS_PASSWORD) {
      app.use(
        ['/swagger', '/swagger-json'],
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
    .addServer(`${xEnv.SERVER_URL}`, 'Main API Server (for main requests)')
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

  const swaggerSpec = SwaggerModule.createDocument(app, swaggerConfig.build());
  SwaggerModule.setup('swagger', app, swaggerSpec, {});

  app.use(swStats.getMiddleware({ swaggerSpec }));

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
bootstrap().catch((e) => {
  Logger.warn(`❌  Error starting server, ${e}`, 'Bootstrap');
  throw e;
});
