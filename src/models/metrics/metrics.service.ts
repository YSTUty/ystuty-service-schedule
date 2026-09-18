import { Injectable, Optional } from '@nestjs/common';

import {
  CounterMetric,
  HistogramMetric,
  PromService,
} from '@khaledez/nestjs-prom';

import * as xEnv from '@my-environment';

const CALENDAR_REQUEST_DURATION_BUCKETS = [
  0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10,
];

type CalendarMetricProtocol = 'ical' | 'caldav';
type CalendarMetricTargetType = 'group' | 'teacher';
type CalendarMetricStatus =
  'success' | 'not_found' | 'method_not_allowed' | 'error';

export interface CalendarRequestMetricParams {
  protocol: CalendarMetricProtocol;
  targetType: CalendarMetricTargetType;
  target: string | number;
  method: string;
}

/**
 * Метрики экспорта календарей. Конкретная группа добавляется только в
 * opt-in series, чтобы не создавать high-cardinality метрики по умолчанию.
 */
@Injectable()
export class MetricsService {
  private readonly prefix = 'ystuty_';

  private readonly calendarRequestCounter: CounterMetric | null;
  private readonly calendarTargetRequestCounter: CounterMetric | null;
  private readonly calendarRequestDurationHistogram: HistogramMetric | null;

  constructor(@Optional() private readonly promService?: PromService) {
    if (!promService) {
      this.calendarRequestCounter = null;
      this.calendarTargetRequestCounter = null;
      this.calendarRequestDurationHistogram = null;
      return;
    }

    this.calendarRequestCounter = promService.getCounter({
      name: `${this.prefix}calendar_request_total`,
      help: 'Successful and failed calendar export requests',
      labelNames: ['protocol', 'target_type', 'method', 'status'],
    });
    this.calendarTargetRequestCounter =
      xEnv.PROMETHEUS_DETAILED_CALENDAR_TARGET_METRICS
        ? promService.getCounter({
            name: `${this.prefix}calendar_target_request_total`,
            help: 'Calendar export requests by concrete group or teacher',
            labelNames: [
              'protocol',
              'target_type',
              'target',
              'method',
              'status',
            ],
          })
        : null;
    this.calendarRequestDurationHistogram = promService.getHistogram({
      name: `${this.prefix}calendar_request_duration_seconds`,
      help: 'Calendar export request duration in seconds',
      labelNames: ['protocol', 'target_type', 'method', 'status'],
      buckets: CALENDAR_REQUEST_DURATION_BUCKETS,
    });
  }

  /**
   * Возвращает idempotent callback для фиксации одного итогового статуса.
   */
  public startCalendarRequestTimer(params: CalendarRequestMetricParams) {
    const labels = {
      protocol: params.protocol,
      target_type: params.targetType,
      method: params.method.toUpperCase(),
    };
    const stopTimer = this.calendarRequestDurationHistogram?.startTimer(labels);
    let isRecorded = false;

    return (status: CalendarMetricStatus): void => {
      if (isRecorded) {
        return;
      }
      isRecorded = true;

      const resultLabels = { ...labels, status };
      this.calendarRequestCounter?.inc(resultLabels);
      this.calendarTargetRequestCounter?.inc({
        ...resultLabels,
        target: String(params.target),
      });
      stopTimer?.({ status });
    };
  }
}
