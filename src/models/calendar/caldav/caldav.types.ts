export interface CalDavCalendarResource {
  /** Имя calendar object resource относительно CalDAV-коллекции. */
  name: string;
  /** Стабильный UID единственного VEVENT в resource. */
  uid: string;
  /** RFC 5545-содержимое calendar object resource. */
  content: string;
  /** Strong ETag, вычисленный по фактическому содержимому resource. */
  etag: string;
  /** Границы события для фильтра CALDAV:calendar-query. */
  startsAt: Date;
  endsAt: Date;
}

export interface CalDavCalendarCollection {
  name: string;
  description: string;
  resources: CalDavCalendarResource[];
}

/** Снимок состояния collection для RFC 6578 incremental sync. */
export interface CalDavSyncSnapshot {
  token: string;
  resourceEtags: Record<string, string>;
}

export type CalDavSyncResult =
  | {
      isValid: true;
      token: string;
      resources: CalDavCalendarResource[];
      deletedResourceNames: string[];
    }
  | {
      isValid: false;
    };
