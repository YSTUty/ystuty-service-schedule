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
const expectedPublicCollectionUrl =
  process.env.CALDAV_EXPECTED_PUBLIC_COLLECTION_URL;
const calDavUsername = process.env.CALDAV_TEST_USERNAME ?? 'calendar-test';
const calDavPassword = process.env.CALDAV_TEST_PASSWORD ?? '';

describeCalDavContract('CalDAV protocol contract (e2e)', () => {
  let authorization: string;
  let calendarHomeUrl: string;
  let calendarCollectionUrl: string;
  let calendarResourceUrl: string;
  let principalUrl: string;
  let syncToken: string;

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
    calendarHomeUrl = '';
    calendarCollectionUrl = '';
    calendarResourceUrl = '';
    principalUrl = '';
    syncToken = '';
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
  });

  it('discovers a principal from the configured calendar home', async () => {
    const collectionResponse = await requestCalDav('PROPFIND', calDavUrl, {
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const collectionBody = await collectionResponse.text();

    expect(collectionResponse.status).toBe(207);
    const principalHref = collectionBody.match(
      /<d:current-user-principal>\s*<d:href>([^<]+)<\/d:href>/,
    )?.[1];
    expect(principalHref).toBeTruthy();
    principalUrl = new URL(principalHref!, calDavUrl).toString();
    expect(new URL(principalUrl).origin).toBe(new URL(calDavUrl!).origin);

    const principalResponse = await requestCalDav('PROPFIND', principalUrl, {
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const principalBody = await principalResponse.text();

    expect(principalResponse.status).toBe(207);
    const calendarHomeHref = principalBody.match(
      /<c:calendar-home-set>\s*<d:href>([^<]+)<\/d:href>/,
    )?.[1];
    expect(calendarHomeHref).toBeTruthy();
    calendarHomeUrl = new URL(calendarHomeHref!, calDavUrl).toString();

    const homeResponse = await requestCalDav('PROPFIND', calendarHomeUrl, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const homeBody = await homeResponse.text();

    expect(homeResponse.status).toBe(207);
    expect(homeBody).toContain('<c:calendar/>');
    expect(homeBody).toContain('<d:current-user-principal>');
  });

  it('discovers one calendar collection through PROPFIND on the calendar home', async () => {
    const response = await requestCalDav('PROPFIND', calDavUrl, {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    });
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(body).toContain('<d:multistatus');
    expect(body).toContain('<c:calendar/>');
    expect(body).not.toContain('<d:getetag>');

    const calendarCollectionHref = Array.from(
      body.matchAll(/<d:href>([^<]+)<\/d:href>/g),
      (match) => match[1],
    ).find((href) => href.endsWith('/calendar/'));
    expect(calendarCollectionHref).toBeTruthy();
    calendarCollectionUrl = new URL(
      calendarCollectionHref!,
      calDavUrl,
    ).toString();
    expect(new URL(calendarCollectionUrl).origin).toBe(
      new URL(calDavUrl!).origin,
    );
    if (expectedPublicCollectionUrl) {
      expect(
        calendarCollectionUrl.startsWith(`${expectedPublicCollectionUrl}/`),
      ).toBe(true);
    }
  });

  it('performs an initial RFC 6578 synchronization', async () => {
    const response = await requestCalDav(
      'REPORT',
      calendarCollectionUrl,
      {
        Depth: '0',
        'Content-Type': 'application/xml; charset=utf-8',
      },
      `<?xml version="1.0" encoding="UTF-8"?>
        <d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:sync-token/>
          <d:sync-level>1</d:sync-level>
          <d:prop><d:getetag/><c:calendar-data/></d:prop>
        </d:sync-collection>`,
    );
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(body).toContain('<c:calendar-data>');
    syncToken = body.match(/<d:sync-token>([^<]+)<\/d:sync-token>/)?.[1] ?? '';
    expect(syncToken).toContain('urn:ystuty:caldav:sync:');
    const resourceHref = body.match(/<d:href>([^<]+\.ics)<\/d:href>/)?.[1];
    expect(resourceHref).toBeTruthy();
    calendarResourceUrl = new URL(
      resourceHref!,
      calendarCollectionUrl,
    ).toString();
  });

  it('performs RFC 6578 incremental synchronization for an unchanged calendar', async () => {
    const response = await requestCalDav(
      'REPORT',
      calendarCollectionUrl,
      {
        Depth: '0',
        'Content-Type': 'application/xml; charset=utf-8',
      },
      `<?xml version="1.0" encoding="UTF-8"?>
        <d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
          <d:sync-token>${syncToken}</d:sync-token>
          <d:sync-level>1</d:sync-level>
          <d:prop><d:getetag/><c:calendar-data/></d:prop>
        </d:sync-collection>`,
    );
    const body = await response.text();

    expect(response.status).toBe(207);
    expect(body).toContain(`<d:sync-token>${syncToken}</d:sync-token>`);
    expect(body).not.toContain('<c:calendar-data>');
  });

  it('returns properties for a discovered calendar object resource', async () => {
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

  it('returns matching iCalendar resources for a calendar-query REPORT', async () => {
    const response = await requestCalDav(
      'REPORT',
      calendarCollectionUrl,
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
    expect(body).not.toContain('METHOD:PUBLISH');
  });

  it('returns a discovered calendar object resource through GET', async () => {
    const response = await requestCalDav('GET', calendarResourceUrl);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    expect(response.headers.get('etag')).toMatch(/^".+"$/);
    await expect(response.text()).resolves.toContain('BEGIN:VCALENDAR');
  });
});
