import { Injectable } from '@nestjs/common';
import ical, {
  ICalCalendar,
  ICalCalendarMethod,
  ICalEventTransparency,
  ICalEventStatus,
} from 'ical-generator';
import * as moment from 'moment';
import * as xEnv from '@my-environment';
import { getLessonTypeStrArr } from '@my-common';
import { ScheduleService } from '../schedule/schedule.service';
import { LessonDto } from '../schedule/dto';

@Injectable()
export class CalendarService {
  constructor(private readonly scheduleService: ScheduleService) {}

  public generateCalendar() {
    return ical()
      .name(`YSTUty Calendar`)
      .url(xEnv.SERVER_URL)
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

  public async generateCalenadrForGroup(groupName: string) {
    const schedule = await this.scheduleService.getByGroup(0, groupName);
    if (!schedule) {
      return null;
    }

    const calendar = this.generateCalendar()
      .name(`YSTUty [${groupName}]`)
      .source(`${xEnv.SERVER_URL}/calendar/group/${groupName}.ical`)
      .description(`Расписание занятий ЯГТУ для группы ${groupName}`);

    for (const lesson of schedule.items.flatMap((e) =>
      e.days.flatMap((e) => e.lessons),
    )) {
      const event = this.createLessonEvent(calendar, lesson)
        .summary(
          `${
            lesson.isDistant ? '(🖥) ' : ''
          }[${getLessonTypeStrArr(lesson.type).join('|')}] ${
            lesson.lessonName || lesson.subInfo
          }${((e) => (e ? ` [${e}]` : ''))(lesson.auditoryName)}`,
        )
        .description(
          `${((e) => (e ? `[${e}]` : ''))(
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

    return calendar;
  }

  public createLessonEvent(calendar: ICalCalendar, lesson: LessonDto) {
    const event = calendar
      .createEvent({
        start: moment(lesson.startAt),
        end: moment(lesson.endAt),
      })
      .status(ICalEventStatus.CONFIRMED)
      .transparency(ICalEventTransparency.OPAQUE);

    if (moment(lesson.startAt).isBefore(moment(lesson.endAt), 'day')) {
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
