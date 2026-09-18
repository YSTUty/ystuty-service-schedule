import { DynamicModule, Global, Module } from '@nestjs/common';

import { PromModule, PromModuleOptions } from '@khaledez/nestjs-prom';
import { DEFAULT_PROM_OPTIONS } from '@khaledez/nestjs-prom/dist/prom.constants';

import * as xEnv from '@my-environment';

import { MetricsService } from './metrics.service';

const METRIC_PATH = '/metrics';

/**
 * Prometheus-интеграция вынесена в отдельный global-модуль, чтобы доменные
 * сервисы не зависели от контроллера или конкретного транспорта.
 */
@Global()
@Module({})
export class MetricsModule {
  static forRoot(): DynamicModule {
    const moduleForRoot: DynamicModule = {
      module: MetricsModule,
      imports: [],
      providers: [MetricsService],
      exports: [MetricsService],
    };

    if (xEnv.PROMETHEUS_ENABLED) {
      const promOptions: PromModuleOptions = {
        metricPath: METRIC_PATH,
        withDefaultsMetrics: true,
        withDefaultController: true,
        // В Nest 11 встроенный filter библиотеки не ограничивается HTTP и
        // может перехватывать исключения других transport-обработчиков.
        withExceptionFilter: false,
        defaultLabels: {
          app: xEnv.INSTANCE_NAME,
        },
      };

      moduleForRoot.imports!.push(PromModule.forRoot(promOptions));

      // Фикс из ystuty-schedule-bot: InboundMiddleware и PromModule должны
      // получать одинаковые опции в Nest 11.
      moduleForRoot.providers!.push({
        provide: DEFAULT_PROM_OPTIONS,
        useValue: promOptions,
      });
    }

    return moduleForRoot;
  }
}
