import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('records a calendar request only once', () => {
    const requestCounter = { inc: jest.fn() };
    const requestDurationHistogram = {
      startTimer: jest.fn(() => jest.fn()),
    };
    const promService = {
      getCounter: jest.fn(() => requestCounter),
      getHistogram: jest.fn(() => requestDurationHistogram),
    };
    const metricsService = new MetricsService(promService as any);

    const stopTimer = metricsService.startCalendarRequestTimer({
      protocol: 'ical',
      targetType: 'group',
      target: 'ЦИС-33',
      method: 'get',
    });
    stopTimer('success');
    stopTimer('error');

    expect(requestCounter.inc).toHaveBeenCalledTimes(1);
    expect(requestCounter.inc).toHaveBeenCalledWith({
      protocol: 'ical',
      target_type: 'group',
      method: 'GET',
      status: 'success',
    });
    expect(requestDurationHistogram.startTimer).toHaveBeenCalledWith({
      protocol: 'ical',
      target_type: 'group',
      method: 'GET',
    });
  });
});
