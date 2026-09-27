/**
 * Проверяет опубликованный read-only CalDAV endpoint через реальные HTTP-методы.
 *
 * Запуск требует явного opt-in, чтобы обычные e2e-тесты не обращались к сети.
 */
const runCalDavContractTests = process.env.RUN_CALDAV_CONTRACT_TESTS === 'true';
const describeCalDavContract = runCalDavContractTests
  ? describe
  : describe.skip;

const calDavUrl = process.env.CALDAV_TEST_URL;
const calDavUsername = process.env.CALDAV_TEST_USERNAME ?? 'calendar-test';
const calDavPassword = process.env.CALDAV_TEST_PASSWORD ?? '';

describeCalDavContract('CalDAV protocol contract (e2e)', () => {
  let authorization: string;
  let calendarResourceUrl: string;

  beforeAll(() => {
    if (!calDavUrl) {
      throw new Error(
        'CALDAV_TEST_URL must be configured for RUN_CALDAV_CONTRACT_TESTS=true',
      );
    }
    if (calDavUrl.endsWith('/calendar.ics')) {
      throw new Error(
        'CALDAV_TEST_URL must point to a collection, not to calendar.ics',
      );
    }

    authorization = `Basic ${Buffer.from(
      `${calDavUsername}:${calDavPassword}`,
    ).toString('base64')}`;
    calendarResourceUrl = `${calDavUrl.replace(/\/$/, '')}/calendar.ics`;
  });

  const requestCalDav = (
    method: string,
    url = calDavUrl!,
    headers: Record<string, string> = {},
    body?: string,
  ) =>
    fetch(url, {
      method,
      headers: {
        Authorization: authorization,
        ...headers,
      },
      body,
    });

  it('advertises CalDAV support through OPTIONS', async () => {
    const response = await requestCalDav('OPTIONS');

    expect(response.status).toBe(204);
    expect(response.headers.get('dav')).toContain('calendar-access');
    expect(response.headers.get('allow')).toContain('PROPFIND');
    expect(response.headers.get('allow')).toContain('REPORT');
  });

  it('discovers the collection and calendar.ics through PROPFIND', async () => {
    const response = await requestCalDav('PROPFIND', calDavUrl, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(body).toContain('<d:multistatus');
    expect(body).toContain('<c:calendar-query/>');
    expect(body).toContain('<c:calendar-multiget/>');
    expect(body).toContain('calendar.ics');
    expect(body).toContain('<d:getetag>');
  });

  it('returns resource properties for a PROPFIND to calendar.ics', async () => {
    const response = await requestCalDav('PROPFIND', calendarResourceUrl, {
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(body).toContain(
      '<d:getcontenttype>text/calendar; charset=utf-8</d:getcontenttype>',
    );
    expect(body).not.toContain('<d:collection/>');
  });

  it('returns iCalendar data for a calendar-query REPORT', async () => {
    const response = await requestCalDav(
      'REPORT',
      calDavUrl,
      {
        Depth: '1',
        'Content-Type': 'application/xml; charset=utf-8',
      },
      `<?xml version="1.0" encoding="UTF-8"?>
        <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:prop><d:getetag/><c:calendar-data/></d:prop>
          <c:filter><c:comp-filter name="VCALENDAR"/></c:filter>
        </c:calendar-query>`,
    );
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('<d:getetag>');
  });

  it('returns the discovered calendar resource through GET', async () => {
    const response = await requestCalDav('GET', calendarResourceUrl);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    expect(response.headers.get('etag')).toMatch(/^".+"$/);
    await expect(response.text()).resolves.toContain('BEGIN:VCALENDAR');
  });
});
