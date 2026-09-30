import { Injectable } from '@nestjs/common';

import * as moment from 'moment';
import { createHash } from 'crypto';
import ical, {
  ICalCalendar,
  ICalCalendarMethod,
  ICalEvent,
  ICalEventStatus,
  ICalEventTransparency,
} from 'ical-generator';

import * as xEnv from '@my-environment';

import { getLessonTypeStrArr } from '@my-common';

import { LessonDto } from '../schedule/dto';
import { ScheduleService } from '../schedule/schedule.service';

import {
  CalDavCalendarCollection,
  CalDavCalendarResource,
} from './caldav/caldav.types';

@Injectable()
export class CalendarService {
  constructor(private readonly scheduleService: ScheduleService) {}

  public generateCalendar() {
    return ical()
      .name(`YSTUty Calendar`)
      .url(xEnv.CUSTOM_CALENDAR_URL)
      .prodId({
        company: 'YSTUty',
        product: `${xEnv.APP_NAME} (Calendar)`,
        language: 'RU',
      })
      .scale('gregorian')
      .method(ICalCalendarMethod.PUBLISH)
      .timezone('Europe/Moscow')
      .description(`Расписание занятий ЯГТУ`)
      .ttl(60 * 60 * 24 * 1.15);
  }

  public async generateCalendarForGroup(groupName: string) {
    return this.buildCalendarForGroup(
      `${xEnv.CUSTOM_CALENDAR_URL}/group/${groupName}.ical`,
      () => groupName,
      () => this.scheduleService.getByGroup(groupName),
    );
  }

  /**
   * Генерирует календарь по постоянному ID группы, сохраняя в нём её
   * актуальное отображаемое имя.
   */
  public async generateCalendarForGroupId(groupId: number) {
    return this.buildCalendarForGroup(
      `${xEnv.CUSTOM_CALENDAR_URL}/group-id/${groupId}.ical`,
      () => this.scheduleService.getGroupNameById(groupId),
      () => this.scheduleService.getByPersistentGroupId(groupId),
    );
  }

  /**
   * Создаёт календарь группы для legacy-ссылки по имени и постоянной — по ID.
   */
  private async buildCalendarForGroup(
    source: string,
    getGroupName: () => string | null | Promise<string | null>,
    getSchedule: () => ReturnType<ScheduleService['getByGroup']>,
  ) {
    const schedule = await getSchedule();
    if (!schedule) {
      return null;
    }
    const groupName = await getGroupName();
    if (!groupName) {
      return null;
    }
    const calendar = this.generateCalendar()
      .name(`YSTUty [${groupName}]`)
      .source(source)
      .description(`Расписание занятий ЯГТУ для группы ${groupName}`);

    for (const lesson of schedule.items.flatMap((e) =>
      e.days.flatMap((e) => e.lessons),
    )) {
      this.configureGroupLessonEvent(
        this.createLessonEvent(calendar, lesson),
        lesson,
      );
    }

    return calendar;
  }

  public async generateCalendarForTeacher(teacherId: number) {
    const schedule = await this.scheduleService.getByTeacher(teacherId);
    if (!schedule) {
      return null;
    }
    const { teacher } = schedule;

    const calendar = this.generateCalendar()
      .name(`YSTUty [${teacher.name}]`)
      .source(`${xEnv.CUSTOM_CALENDAR_URL}/teacher/${teacherId}.ical`)
      .description(`Расписание занятий ЯГТУ для преподавателя ${teacher.name}`);

    for (const lesson of schedule.items.flatMap((e) =>
      e.days.flatMap((e) => e.lessons),
    )) {
      this.configureTeacherLessonEvent(
        this.createLessonEvent(calendar, lesson),
        lesson,
      );
    }

    return calendar;
  }

  /** Формирует read-only CalDAV-коллекцию группы из отдельных VEVENT-resources. */
  public async generateCalDavCalendarForGroup(
    groupName: string,
  ): Promise<CalDavCalendarCollection | null> {
    const schedule = await this.scheduleService.getByGroup(groupName);
    return schedule
      ? this.createCalDavCollection(
          groupName,
          `Расписание занятий ЯГТУ для группы ${groupName}`,
          schedule.items.flatMap((week) =>
            week.days.flatMap((day) => day.lessons),
          ),
          (event, lesson) => this.configureGroupLessonEvent(event, lesson),
        )
      : null;
  }

  /** Формирует CalDAV-коллекцию по постоянному `gruppa.idgroup`. */
  public async generateCalDavCalendarForGroupId(
    groupId: number,
  ): Promise<CalDavCalendarCollection | null> {
    const [groupName, schedule] = await Promise.all([
      this.scheduleService.getGroupNameById(groupId),
      this.scheduleService.getByPersistentGroupId(groupId),
    ]);
    if (!groupName || !schedule) {
      return null;
    }

    return this.createCalDavCollection(
      groupName,
      `Расписание занятий ЯГТУ для группы ${groupName}`,
      schedule.items.flatMap((week) => week.days.flatMap((day) => day.lessons)),
      (event, lesson) => this.configureGroupLessonEvent(event, lesson),
    );
  }

  /** Формирует read-only CalDAV-коллекцию преподавателя. */
  public async generateCalDavCalendarForTeacher(
    teacherId: number,
  ): Promise<CalDavCalendarCollection | null> {
    const schedule = await this.scheduleService.getByTeacher(teacherId);
    if (!schedule) {
      return null;
    }

    const { teacher } = schedule;
    return this.createCalDavCollection(
      teacher.name,
      `Расписание занятий ЯГТУ для преподавателя ${teacher.name}`,
      schedule.items.flatMap((week) => week.days.flatMap((day) => day.lessons)),
      (event, lesson) => this.configureTeacherLessonEvent(event, lesson),
    );
  }

  /**
   * CalDAV хранит каждое событие с отдельным UID в собственном resource.
   * Legacy iCalendar намеренно использует другой общий сериализатор.
   */
  private createCalDavCollection(
    name: string,
    description: string,
    lessons: LessonDto[],
    configureEvent: (event: ICalEvent, lesson: LessonDto) => void,
  ): CalDavCalendarCollection {
    const resources = lessons.map((lesson) =>
      this.createCalDavCalendarResource(lesson, configureEvent),
    );

    return { name, description, resources };
  }

  private createCalDavCalendarResource(
    lesson: LessonDto,
    configureEvent: (event: ICalEvent, lesson: LessonDto) => void,
  ): CalDavCalendarResource {
    const uid = this.getCalDavEventUid(lesson);
    const calendar = ical()
      .prodId({
        company: 'YSTUty',
        product: `${xEnv.APP_NAME} (CalDAV)`,
        language: 'RU',
      })
      .scale('gregorian');
    const event = this.createLessonEvent(calendar, lesson)
      .id(uid)
      // Источник не отдаёт дату изменения, поэтому используем стабильную дату
      // занятия вместо времени генерации: это сохраняет ETag между запросами.
      .stamp(new Date(lesson.startAt));
    configureEvent(event, lesson);

    const content = calendar.toString();
    const hash = createHash('sha256').update(uid).digest('hex');

    return {
      name: `${hash}.ics`,
      uid,
      content,
      etag: `"${createHash('sha256').update(content).digest('hex')}"`,
      startsAt: new Date(lesson.startAt),
      endsAt: new Date(lesson.endAt),
    };
  }

  private getCalDavEventUid(lesson: LessonDto): string {
    const fallbackKey = [
      lesson.startAt,
      lesson.endAt,
      lesson.lessonName,
      lesson.subInfo,
      lesson.teacherName,
      lesson.auditoryName,
    ].join('\u0000');
    const sourceKey = lesson.calendarResourceKey || fallbackKey;

    return `ystuty-${createHash('sha256').update(sourceKey).digest('hex')}@ical.ystuty.ru`;
  }

  private configureGroupLessonEvent(event: ICalEvent, lesson: LessonDto): void {
    event
      .summary(
        `${lesson.isDistant ? '(🖥) ' : ''}[${getLessonTypeStrArr(
          lesson.type,
        ).join('/')}] ${lesson.lessonName || lesson.subInfo}${((value) =>
          value ? ` [${value}]` : '')(lesson.auditoryName)}`,
      )
      .description(
        `${((value) => (value ? `[${value}]` : ''))(
          lesson.auditoryName,
        )}${lesson.isDistant ? ' (Дистант)' : ''} ${lesson.teacherName}`,
      );

    if (lesson.teacherName) {
      event.organizer({
        name: lesson.teacherName,
        email: 'nope@ystu.ru',
      });
    }
  }

  private configureTeacherLessonEvent(
    event: ICalEvent,
    lesson: LessonDto,
  ): void {
    event
      .summary(
        `${lesson.isDistant ? '(🖥) ' : ''}[${getLessonTypeStrArr(
          lesson.type,
        ).join('/')}] ${lesson.lessonName || lesson.subInfo}${((value) =>
          value ? ` [${value}]` : '')(lesson.auditoryName)}`,
      )
      .description(
        `${((value) => (value ? `[${value}]` : ''))(lesson.auditoryName)}${
          lesson.isDistant ? ' (Дистант)' : ''
        } Групп${
          (lesson.groups?.length ?? 0) > 1 ? 'а' : 'ы'
        } (${(lesson.groups ?? []).join(', ')})`,
      );
  }

  public createLessonEvent(calendar: ICalCalendar, lesson: LessonDto) {
    const event = calendar
      .createEvent({
        start: moment(lesson.startAt),
        end: moment(lesson.endAt),
      })
      .status(ICalEventStatus.CONFIRMED)
      .transparency(ICalEventTransparency.OPAQUE);

    if (
      moment(lesson.startAt).isBefore(
        moment(lesson.endAt).add(1, 'hour'),
        'day',
      )
    ) {
      event.allDay(true);
    }

    if (lesson.auditoryName) {
      event.location({
        title: `${lesson.auditoryName}`,
        address: `Ярославль, ЯГТУ${
          lesson.auditoryName
            ? ((e: string[]) =>
                e.length > 1 ? `, Корпус ${e[0]}` : `, ${e[0]}`)(
                lesson.auditoryName.split('-'),
              )
            : ''
        }`,
      });
    }

    return event;
  }
}
