import { CalDavService } from './caldav.service';

describe('CalDavService', () => {
  const calendarContent = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n';

  it('advertises read-only calendar reports and resource metadata', () => {
    const service = new CalDavService();
    const calendar = service.createCalendarResource(calendarContent);
    const response = service.createPropfindResponse(
      '/v1/calendar/caldav/group-id/4627/',
      'ЦИС-26',
      calendar,
      '1',
    );

    expect(response).toContain('<c:calendar-query/>');
    expect(response).toContain('<c:calendar-multiget/>');
    expect(response).toContain('<d:getcontentlength>32</d:getcontentlength>');
    expect(response).toContain('<d:getetag>');
    expect(response).toContain('calendar.ics');
  });

  it('returns only resource metadata for a resource PROPFIND', () => {
    const service = new CalDavService();
    const calendar = service.createCalendarResource(calendarContent);
    const response = service.createCalendarResourcePropfindResponse(
      '/v1/calendar/caldav/group-id/4627/calendar.ics',
      calendar,
    );

    expect(response).toContain(
      '<d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>',
    );
    expect(response).not.toContain('<d:collection/>');
  });
});
