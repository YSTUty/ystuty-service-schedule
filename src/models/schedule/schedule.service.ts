import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as moment from 'moment';

import { LessonFlags, WeekParityType } from '@my-interfaces';
import {
  getLessonTypeFromStr,
  getWeekNumber,
  getWeekOffsetByYear,
} from '@my-common';

import { Exam, ScheduleView } from './entity';
import { LessonDto, OneDayDto, OneWeekDto } from './dto';

interface IExamDay {
  date: Date;
  lessonName: string;
  auditoryName: string;
  teacherName: string;
}

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleView)
    private readonly raspzViewRepository: Repository<ScheduleView>,
    @InjectRepository(Exam)
    private readonly examenRepository: Repository<Exam>,
  ) {}

  async getGroups(idSchedule: number, short = false) {
    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz')
      .innerJoin('ugod', 'u', 'u.oid = n.ugod')
      .innerJoin('n_perr', 'p', 'p.IDperr = n.IDperr')
      .leftJoin('fullfac', 'f', 'f.idfac = r.idfac')

      .select("RTRIM(u.name) + ' ' + RTRIM(p.nameperr)", 'namerasp')
      .addSelect('f.namefac', 'namefac')
      .addSelect('r.kurs', 'courseNumber')
      .addSelect('r.ng', 'ng')
      .addSelect('r.idgr', 'groupId')
      .addSelect('r.namegr', 'name')
      .addSelect('r.fl_lek', 'fl_lek')
      .addSelect('r.idfac', 'idfac')

      .groupBy('u.name')
      .addGroupBy('p.nameperr')
      .addGroupBy('f.namefac')
      .addGroupBy('r.idfac')
      .addGroupBy('r.fl_lek')
      .addGroupBy('r.kurs')
      .addGroupBy('r.ng')
      .addGroupBy('r.idgr')
      .addGroupBy('r.namegr')
      .addGroupBy('n.nned_data0')

      .orderBy('r.idfac', 'DESC')
      .addOrderBy('r.fl_lek', 'DESC')
      .addOrderBy('r.kurs', 'ASC')
      .addOrderBy('r.ng', 'ASC')
      .addOrderBy('r.namegr', 'ASC');

    if (idSchedule > 0) {
      qb.where('r.idraspz = :idSchedule', { idSchedule });
    } else {
      qb.where('n.fl_pub > 0');
    }

    const raws = await qb.getRawMany();

    const rowsByFaculty: Record<
      number,
      {
        id?: number;
        name: string;
        groups: (
          | {
              course: number;
              name: string;
              id_schedule: number;
              hasLecture: boolean;
            }
          | string
        )[];
      }
    > = {};
    let namerasp = null;

    for (const raw of raws) {
      const { idfac, groupId, namefac, name, courseNumber, fl_lek } = raw;
      namerasp = raw.namerasp;

      if (!rowsByFaculty[idfac]) {
        rowsByFaculty[idfac] = {
          name: namefac,
          groups: [],
        };
        if (!short) {
          rowsByFaculty[idfac].id = idfac;
        }
      }

      if (short) {
        rowsByFaculty[idfac].groups.push(name);
      } else {
        let group = (
          rowsByFaculty[idfac].groups as {
            course: number;
            name: string;
            id_schedule: number;
            hasLecture: boolean;
          }[]
        ).find((e) => e.name === name);
        if (!group) {
          group = {
            course: courseNumber,
            name: name,
            id_schedule: groupId || null,
            hasLecture: false,
          };
          rowsByFaculty[idfac].groups.push(group);
        }

        if (fl_lek > 0) {
          group.hasLecture = true;
        }
      }
    }

    return {
      name: namerasp,
      items: Object.values(rowsByFaculty),
    };
  }

  async getByGroup(idSchedule: number, groupIdOrName: number | string) {
    // const file: [string, string] = [
    //   'schedule-getByGroup',
    //   `${idSchedule}-${groupIdOrName}`,
    // ];

    // const isTimeout = await cacheManager.checkTimeout(file);

    // if (isTimeout === false) {
    //   const cacheData = await cacheManager.readData(file);
    //   if (cacheData.length) {
    //     return { isCache: true, items: cacheData };
    //   }
    // }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      .andWhere('childz = :childz', { childz: 0 })

      .orderBy('datz', 'ASC')
      .addOrderBy('nned', 'ASC')
      .addOrderBy('npar', 'ASC');

    if (!isNaN(Number(groupIdOrName))) {
      qb.andWhere('idgr = :idgr', { idgr: groupIdOrName });
    } else {
      qb.andWhere('LOWER(namegr) = LOWER(:namegr)', {
        namegr: groupIdOrName,
      });
    }

    if (idSchedule > 0) {
      qb.andWhere('idraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const raspz = await qb.getMany();

    let parityOnWeekMap: Map<number, WeekParityType> = new Map();
    const parityOnWeek = (trainingId: number): WeekParityType => {
      if (parityOnWeekMap.has(trainingId)) {
        return parityOnWeekMap.get(trainingId);
      }
      let total = 0;
      let odd = 0;
      for (const raw of raspz) {
        if (raw.trainingId === trainingId) {
          ++total;
          if (raw.weekNumber % 2 === 1) {
            ++odd;
          }
        }
      }
      let res =
        total === odd
          ? WeekParityType.ODD
          : odd === 0
            ? WeekParityType.EVEN
            : WeekParityType.CUSTOM;
      parityOnWeekMap.set(trainingId, res);
      return res;
    };

    const weeks: OneWeekDto[] = [];
    for (const raw of raspz) {
      const {
        date,
        startAt,
        lessonNumber,
        weekNumber,
        timeInterval,
        lessonName,
        auditoryName_1,
        auditoryName_2,
        teacherName_1,
        teacherName_2,
        streamRefId,
        academicHours,
        isShort,
        isDistant,
        isDivision,
        lessonTypeShortName,
        additionalInfo,
        trainingId,
        lectureFlag,
      } = raw;

      let curWeek = weeks.find((e) => e.number === weekNumber);
      if (!curWeek) {
        curWeek = {
          number: weekNumber,
          days: [],
        };
        weeks.push(curWeek);
      }

      let curDay = curWeek.days.find((e) => e.info.date === date);
      if (!curDay) {
        curDay = {
          info: {
            // name: `[type:${weekNumber}]`,
            type: weekNumber - 1,
            date,
            weekNumber,
          },
          lessons: [],
        };
        curWeek.days.push(curDay);
      }

      let number = lessonNumber;
      if (number > 2 || number > 7) {
        --number;
      }

      const durationMinutes = ((f, fixT = 1) => f * 90 + (f - fixT) * 10)(
        Math.floor(academicHours),
        academicHours > 1 ? (number === 2 ? -2 : number === 5 ? 0 : 1) : 1,
      );

      let time = timeInterval;
      let [startTime, endTime] = timeInterval.split('-');
      if (academicHours > 1 && startTime && endTime) {
        const dateTime = new Date(0);
        const ds = startTime.split(':').map(Number);
        dateTime.setHours(ds[0], ds[1]);
        dateTime.setMinutes(dateTime.getMinutes() + durationMinutes);
        endTime = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        time = `${startTime}-${endTime}`;
      }

      let originalTime =
        academicHours > 1 ? `${startTime}-...${academicHours * 2}ч` : time;

      if (isShort) time += ' [SHORT]';

      const typeRegExp = new RegExp(
        '' +
          '( ?(?<online>\\(онлайн\\)))?' +
          '(,? ?(\\+ ?)?(?<types2>teams|лекция|лек\\.|лаб\\.|пр\\.з\\.?|кп\\.?|конс\\.?|зач\\.?|диф\\.зач\\.?|экз\\.?))?' +
          '(,? ?(\\+ ?)?(?<types3>teams|лекция|лек\\.|лаб\\.|пр\\.з\\.?|кп\\.?|конс\\.?|зач\\.?|диф\\.зач\\.?|экз\\.?))?' +
          '(,? ?(\\+ ?)?(?<types4>teams|лекция|лек\\.|лаб\\.|пр\\.з\\.?|кп\\.?|конс\\.?|зач\\.?|диф\\.зач\\.?|экз\\.?))?' +
          '(,? ?(\\+ ?)?(?<types5>teams|лекция|лек\\.|лаб\\.|пр\\.з\\.?|кп\\.?|конс\\.?|зач\\.?|диф\\.зач\\.?|экз\\.?))?' +
          '(,? ?\\(\\+(?<types6>teams|лекция|лек\\.?|лаб\\.?|пр\\.?з?\\.?|кп\\.?|конс\\.?|зач\\.?|диф\\.?зач\\.?|экз\\.?)\\))?' +
          ',?\\+?' +
          '( ?(?<subInfo>.*))?',
        'i',
      );
      const typeGroups = additionalInfo.match(typeRegExp).groups || {};
      // const isOnline = !!typeGroups.online;
      const subInfo = typeGroups.subInfo;

      let type: LessonFlags = [
        lessonTypeShortName || '',
        typeGroups.types2 || '',
        typeGroups.types3 || '',
        typeGroups.types4 || '',
        typeGroups.types5 || '',
        typeGroups.types6 || '',
      ]
        .filter(Boolean)
        .flatMap((e) => e.split(','))
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .reduce(
          (prev, type) => (prev |= getLessonTypeFromStr(type)),
          LessonFlags.None,
        );

      const subInfoLower = subInfo?.toLowerCase();
      if (subInfoLower) {
        let libraryStrings = [subInfoLower, lessonName?.toLowerCase()].filter(
          Boolean,
        );
        if (
          libraryStrings.some(
            (str) =>
              str.includes('библ.') ||
              str.includes('библиот') ||
              str.includes('книговыдача'),
          )
        ) {
          type |= LessonFlags.Library;
        }
      }

      if (type === LessonFlags.None && lessonName) {
        // TODO: add more combinations
        if (lessonName.includes('исследовательская работа')) {
          type |= LessonFlags.ResearchWork;
        }
      }

      let lesson: LessonDto = {
        number,
        startAt,
        time,
        originalTimeTitle: `${lessonNumber}. ${originalTime}`,
        parity: parityOnWeek(trainingId),
        lessonName,
        type,
        isStream: streamRefId > 0,
        duration: academicHours * 2,
        durationMinutes,
        isDivision,
        auditoryName:
          [auditoryName_1, auditoryName_2].filter(Boolean).join('; ').trim() ||
          null,
        teacherName:
          [teacherName_1, teacherName_2].filter(Boolean).join('; ').trim() ||
          null,
        isDistant,
        endAt: new Date(
          startAt.getTime() + durationMinutes * 60e3,
        ).toISOString(),
        subInfo,
        isShort,
        isLecture: lectureFlag > 0,
      };
      curDay.lessons.push(lesson);
    }

    // use exams
    if (true) {
      const qbExam = this.examenRepository
        .createQueryBuilder('e')
        .where('1=1')
        .andWhere('isnull(e.noras, 0) <= 0')
        .andWhere('e.data IS NOT NULL')

        .select('e.data', 'date')
        // .addSelect('g.namegroup', 'namegr')
        .addSelect('p.namepredmet', 'lessonName')
        .addSelect('a.nameaudi', 'auditoryName')
        .addSelect('pr.fio1', 'teacherName')

        .leftJoin('audi', 'a', 'a.idaudi = e.idaudi')
        .leftJoin('gruppa', 'g', 'e.idgroup = g.idgroup')
        .leftJoin('predmet', 'p', 'e.idpredmet = p.idpredmet')
        .leftJoin('prep_examen', 'pe', 'pe.idexam = e.idexam')
        .leftJoin('prep', 'pr', 'pe.idprep = pr.idprep');

      qbExam.andWhere('LOWER(g.namegroup) = LOWER(:namegroup)', {
        namegroup: groupIdOrName,
      });
      const exams: IExamDay[] = await qbExam.getRawMany();
      if (exams.length > 0) {
        this.injectExams(weeks, exams);
      }
    }

    const items = weeks;
    // await cacheManager.update(file, items, 10e3);

    return { isCache: false, items };
  }

  private injectExams(schedule: OneWeekDto[], exams: IExamDay[]) {
    for (const exam of exams) {
      let targetDay: OneDayDto = null;

      let isFound = false;
      for (const { days } of schedule) {
        if (isFound) break;
        for (const day of days) {
          if (
            day.lessons.some((e) =>
              moment(e.startAt).isSame(exam.date, 'day'),
            ) ||
            moment(day.info.date)?.isSame(exam.date, 'day')
          ) {
            targetDay = day;
            isFound = true;
            break;
          }
        }
      }

      const lessonFormat: LessonDto = {
        startAt: exam.date,
        endAt: moment(exam.date).add(23, 'hour').toDate(),

        number: null,
        time: null,
        parity: null,

        lessonName: exam.lessonName,
        type: LessonFlags.Exam,

        originalTimeTitle: null,
        isStream: false,
        duration: null,
        durationMinutes: null,
        isDivision: false,
        auditoryName: exam.auditoryName,
        teacherName: exam.teacherName,
      };

      if (targetDay) {
        targetDay.lessons.push(lessonFormat);
        continue;
      }

      const startAtDate = new Date(lessonFormat.startAt);
      const weekNumber =
        getWeekNumber(startAtDate) - getWeekOffsetByYear(startAtDate);

      const oneDayExam: OneDayDto = {
        info: {
          type: moment(exam.date).day() - 1,
          weekNumber,
          date: moment(exam.date).second(0).minute(0).hour(0).toDate(),
        },
        lessons: [lessonFormat],
      };

      let weekIndex = schedule.findIndex((e) => e.number === weekNumber);
      if (weekIndex === -1) {
        const newWeek = {
          number: weekNumber,
          days: [],
        };
        weekIndex += schedule.push(newWeek);
      }
      schedule[weekIndex].days.push(oneDayExam);
    }
  }
}
