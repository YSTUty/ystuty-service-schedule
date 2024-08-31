import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import { DataSourceOptions } from 'typeorm';

const config = dotenv.config();
dotenvExpand.expand(config);

export enum EnvType {
  DEV = 'development',
  PROD = 'production',
  TEST = 'testing',
}

// environment
export const NODE_ENV: EnvType =
  (process.env.NODE_ENV as EnvType) || EnvType.DEV;

// Application
export const APP_NAME: string =
  process.env.MAIN_NAME || '[YSTUty.Service] Schedule';
export const APP_DOMAIN: string = process.env.MAIN_DOMAIN || '127.0.0.1';
export const SERVER_PORT: number = +process.env.SERVER_PORT || 8080;
export const SERVER_EXTERNAL_PORT: number =
  +process.env.SERVER_EXTERNAL_PORT || SERVER_PORT;
export const SERVER_URL: string =
  process.env.SERVER_URL || `http://${APP_DOMAIN}:${SERVER_EXTERNAL_PORT}`;
export const CUSTOM_CALENDAR_URL: string =
  process.env.CUSTOM_CALENDAR_URL || `${SERVER_URL}/v1/calendar`;

// * oAuth server
export const MS_OAUTH_SERVER_PORT: number =
  +process.env.MS_OAUTH_SERVER_PORT ?? 3000;
export const MS_OAUTH_SERVER_HOST: string =
  process.env.MS_OAUTH_SERVER_HOST ?? 'ms_oauth_server';
export const OAUTH_SERVER_SERVICE_TOKEN: string =
  process.env.OAUTH_SERVER_SERVICE_TOKEN;

// * oAuth Client
export const OAUTH_URL = process.env.OAUTH_URL || 'http://ystuty_oauth';
export const OAUTH_CLIENT_ID =
  process.env.OAUTH_CLIENT_ID || 'ystuty-social-connect';
export const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || '';
// export const OAUTH_REDIRECT_URI =
//   process.env.OAUTH_REDIRECT_URI || `${SERVER_URL}/callback/oauth`;

// * Swagger
export const SWAGGER_ACCESS_USERNAME: string =
  process.env.SWAGGER_ACCESS_USERNAME || '';
export const SWAGGER_ACCESS_PASSWORD: string =
  process.env.SWAGGER_ACCESS_PASSWORD || '';
export const SWAGGER_ACCESS_PASSWORD_STATS: string =
  process.env.SWAGGER_ACCESS_PASSWORD_STATS || '';

// * TypeORM
export const mssqlDefaults: DataSourceOptions = {
  type: 'mssql' as const,
  synchronize: false,
  maxQueryExecutionTime: 3e3,
  options: {
    encrypt: false,
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1',
    },
  },
};

export const TYPEORM_CONFIG = {
  ...mssqlDefaults,
  logging: process.env.TYPEORM_LOGGING === 'true',
  host: process.env.TYPEORM_HOST,
  port: +process.env.TYPEORM_PORT || 1433,
  username: process.env.TYPEORM_USER,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE || 'master',
  schema: process.env.TYPEORM_SCHEMA,
};

// * Redis
export const REDIS_HOST: string = process.env.REDIS_HOST || 'redis';
export const REDIS_PORT: number = +process.env.REDIS_PORT || 6379;
export const REDIS_USER: string = process.env.REDIS_USER;
export const REDIS_PASSWORD: string = process.env.REDIS_PASSWORD;
export const REDIS_DATABASE: number = +process.env.REDIS_DATABASE || 0;
export const REDIS_PREFIX: string =
  process.env.REDIS_PREFIX ?? 'ystuty:service:schedule:';
