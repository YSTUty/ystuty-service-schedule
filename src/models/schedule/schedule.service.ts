import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as moment from 'moment';

import {
  analyzeLessonType,
  getWeekNumber,
  getWeekOffsetByYear,
} from '@my-common';
import { LessonFlags, WeekNumberType, WeekParityType } from '@my-interfaces';

import { RedisService } from '../redis/redis.service';

import {
  GroupDetailDto,
  InstituteGroupsDto,
  LessonDto,
  OneDayDto,
  OneWeekDto,
  ScheduleSemesterDto,
} from './dto';
import {
  Auditory,
  Exam,
  RaspGrWeekView,
  ScheduleSemester,
  ScheduleView,
  Teacher,
} from './entity';

interface IExamDay {
  date: Date;
  lessonName: string;
  auditoryName: string;
  teacherName?: string;
  groupName?: string;
  note?: string;
}

export interface CacheMetadata {
  /** Данные этого ответа были прочитаны из Redis-кэша. */
  isCached: boolean;
  /** Оставшееся время жизни Redis-кэша в секундах. */
  ttlSeconds: number | null;
}

interface CachedValue<T> {
  value: T;
  ttlSeconds: number | null;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  protected allowCaching = true;

  constructor(
    @InjectRepository(ScheduleView)
    private readonly raspzViewRepository: Repository<ScheduleView>,
    @InjectRepository(RaspGrWeekView)
    private readonly raspGrWeekViewRepository: Repository<RaspGrWeekView>,
    @InjectRepository(Exam)
    private readonly examenRepository: Repository<Exam>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Auditory)
    private readonly audienceRepository: Repository<Auditory>,
    @InjectRepository(ScheduleSemester)
    private readonly scheduleSemesterRepository: Repository<ScheduleSemester>,

    private readonly redisService: RedisService,
  ) {}

  /** Безопасно обновляет необязательный Redis-кэш. */
  private async writeCache(
    cacheKey: string,
    value: unknown,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redisService.redis.set(
        cacheKey,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      const cacheError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Redis cache write failed: ${cacheError.message}`,
        cacheError.stack,
      );
    }
  }

  /**
   * Читает значение и оставшееся время жизни Redis-кэша одним интерфейсом.
   */
  private async readCache<T>(cacheKey: string): Promise<CachedValue<T> | null> {
    try {
      const [cachedData, ttlSeconds] = await Promise.all([
        this.redisService.redis.get(cacheKey),
        this.redisService.redis.ttl(cacheKey),
      ]);
      if (!cachedData) {
        return null;
      }

      return {
        value: JSON.parse(cachedData) as T,
        ttlSeconds: ttlSeconds >= 0 ? ttlSeconds : null,
      };
    } catch (error) {
      const cacheError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Redis cache read failed: ${cacheError.message}`,
        cacheError.stack,
      );
      return null;
    }
  }

  /**
   * Сохраняет обратную совместимость с isCache и добавляет точные метаданные.
   */
  private withCacheMetadata<T extends object>(
    value: T,
    isCached: boolean,
    ttlSeconds: number | null = null,
  ): T & { isCache: boolean; cache: CacheMetadata } {
    return {
      ...value,
      isCache: isCached,
      cache: {
        isCached,
        ttlSeconds: isCached ? ttlSeconds : null,
      },
    };
  }

  async getCount(
    type: 'institute' | 'group' | 'teachers' | 'audiences',
    idSchedule: number = 0,
  ) {
    const cacheKey = `count:${idSchedule}:${type}`;
    if (this.allowCaching) {
      const cached = await this.readCache<{ count: number }>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { count: cached.value.count || null },
          true,
          cached.ttlSeconds,
        );
      }
    }

    let info: {
      items: any[];
      count?: number;
    } = null;
    if (type === 'group' || type === 'institute') {
      info = await this.getGroups(idSchedule, false);
    } else if (type === 'audiences') {
      info = await this.getAudiencesBySchedule(idSchedule);
    } else if (type === 'teachers') {
      info = await this.getTeachersBySchedule(idSchedule);
    }

    if (!info) {
      return this.withCacheMetadata({ count: null }, false);
    }
    const response = {
      count:
        type === 'group'
          ? info.items.flatMap((e) => e.groups).length
          : (info.count ?? info.items.length),
    };

    if (this.allowCaching && response) {
      await this.writeCache(cacheKey, response, 60 * 10);
    }
    return this.withCacheMetadata(response, false);
  }

  async getGroups(idSchedule: number, additional = true) {
    const cacheKey = `groups:${idSchedule}:additional-${additional}`;
    if (this.allowCaching) {
      const cached = await this.readCache<{
        name: string;
        items: InstituteGroupsDto[];
      }>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(cached.value, true, cached.ttlSeconds);
      }
    }

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

    const rowsByFaculty: Record<number, InstituteGroupsDto> = {};
    let defaultNamerasp: string = null;

    for (const raw of raws) {
      const {
        namerasp,
        idfac,
        groupId,
        namefac,
        name,
        courseNumber,
        fl_lek,
      }: {
        namerasp: string;
        idfac: number;
        groupId: number;
        namefac: string;
        name: string;
        courseNumber: number;
        fl_lek: number;
      } = raw;
      defaultNamerasp = namerasp;

      if (!rowsByFaculty[idfac]) {
        rowsByFaculty[idfac] = {
          name: namefac,
          groups: [],
        };
        if (additional) {
          rowsByFaculty[idfac].id = idfac;
        }
      }

      if (!additional) {
        rowsByFaculty[idfac].groups.push(name);
      } else {
        let group = (rowsByFaculty[idfac].groups as GroupDetailDto[]).find(
          (e) => e.name === name,
        );
        if (!group) {
          group = {
            course: courseNumber,
            name,
            id_schedule: groupId || null,
            groupId,
            hasLecture: false,
            scheduleName: namerasp,
          };
          rowsByFaculty[idfac].groups.push(group);
        }

        if (fl_lek > 0) {
          group.hasLecture = true;
        }
      }
    }

    const items = Object.values(rowsByFaculty);
    if (items.length === 0) {
      return null;
    }

    if (!additional) {
      for (const item of items) {
        item.groups = [...new Set(item.groups as string[])].sort((a, b) =>
          a.localeCompare(b),
        );
      }
    }

    const response = {
      /** @deprecated */
      name: defaultNamerasp,
      items,
    };
    if (this.allowCaching) {
      await this.writeCache(cacheKey, response, 60 * 10);
    }

    return this.withCacheMetadata(response, false);
  }

  async getByGroup(groupIdOrName: number | string, idSchedule: number = 0) {
    const cacheKey = `byGroup:${idSchedule}:${String(groupIdOrName).toLowerCase()}`;
    if (this.allowCaching) {
      const cached = await this.readCache<OneWeekDto[]>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { items: cached.value },
          true,
          cached.ttlSeconds,
        );
      }
    }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      .andWhere('childz = :childz', { childz: 0 })

      .orderBy('datz', 'ASC')
      .addOrderBy('nned', 'ASC')
      .addOrderBy('npar', 'ASC');

    if (!isNaN(Number(groupIdOrName))) {
      qb.andWhere('idgr = :id', { id: groupIdOrName });
    } else {
      qb.andWhere('LOWER(namegr) = LOWER(:name)', {
        name: groupIdOrName,
      });
    }

    if (idSchedule > 0) {
      qb.andWhere('idraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const raspz = await qb.getMany();
    const weeks = this.createWeek(raspz, 'group');

    // use exams
    if (!idSchedule) {
      const qbExam = this.examenRepository
        .createQueryBuilder('e')
        .where('1=1')
        .andWhere('isnull(e.noras, 0) <= 0')
        .andWhere('e.data IS NOT NULL')

        .select('e.data', 'date')
        .addSelect('p.namepredmet', 'lessonName')
        .addSelect('a.nameaudi', 'auditoryName')
        .addSelect('pr.fio1', 'teacherName')
        .addSelect('e.note', 'note')

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
        this.injectExams(weeks, exams, 'group');
      }
    }

    const items = weeks;
    if (items.length === 0) {
      return null;
    }

    if (this.allowCaching) {
      await this.writeCache(cacheKey, items, 60 * 5);
    }

    return this.withCacheMetadata({ items }, false);
  }

  async getByGroupAsWeek(
    groupIdOrName: number | string,
    idSchedule: number = 0,
  ) {
    const cacheKey = `byGroupAsWeek:${idSchedule}:${String(groupIdOrName).toLowerCase()}`;
    if (this.allowCaching) {
      const cached = await this.readCache<OneWeekDto[]>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { items: cached.value },
          true,
          cached.ttlSeconds,
        );
      }
    }

    let groupId = Number(groupIdOrName);
    let idraspz = idSchedule;

    if (isNaN(groupId) || !idraspz) {
      const qb = this.raspzViewRepository.createQueryBuilder('r').where('1=1');

      if (!isNaN(Number(groupIdOrName))) {
        qb.andWhere('idgr = :id', { id: groupIdOrName });
      } else {
        qb.andWhere('LOWER(namegr) = LOWER(:name)', {
          name: groupIdOrName,
        });
      }

      if (idSchedule > 0) {
        qb.andWhere('idraspz = :idSchedule', { idSchedule });
      } else {
        qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz');
        qb.andWhere('n.fl_pub > 0');
      }

      const raspz = await qb.getOne();
      if (!raspz) {
        return null;
      }
      groupId = raspz.groupId;
      idraspz = raspz.IDraspz;
    }

    if (!groupId || !idraspz) {
      return null;
    }

    const items = [];

    // 1-7
    for (
      let ndow = WeekNumberType.Monday;
      ndow < WeekNumberType.Sunday;
      ++ndow
    ) {
      let isLecture = true;
      do {
        const qb = this.raspGrWeekViewRepository
          .createQueryBuilder('r')
          .setParameters({
            idraspz: idraspz,
            idgr: groupId,
            ndow: ndow + 1,
            lek: isLecture ? 1 : 0,
          })
          .orderBy('r.npar')
          .addOrderBy('r.idz');

        const week = await qb.disableEscaping().getMany();

        items.push({
          weekType: ndow,
          week,
          isLecture,
        });

        if (!isLecture) {
          break;
        }
        isLecture = false;
      } while (true);
    }

    if (items.length === 0) {
      return null;
    }

    if (this.allowCaching) {
      await this.writeCache(cacheKey, items, 60 * 5);
    }

    return this.withCacheMetadata({ items }, false);
  }

  async getByTeacher(teacherId: number, idSchedule: number = 0) {
    const cacheKey = `byTeacher:${idSchedule}:${teacherId}`;
    if (this.allowCaching) {
      const cached = await this.readCache<{
        teacher: {
          name: string;
          id: number;
        };
        items: OneWeekDto[];
      }>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(cached.value, true, cached.ttlSeconds);
      }
    }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      .andWhere('childz = :childz', { childz: 0 })

      .orderBy('datz', 'ASC')
      .addOrderBy('nned', 'ASC')
      .addOrderBy('npar', 'ASC');

    if (!isNaN(Number(teacherId))) {
      qb.andWhere('(prep = :id OR prep2 = :id)', { id: teacherId });
    }

    if (idSchedule > 0) {
      qb.andWhere('idraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const raspz = await qb.getMany();
    const weeks = this.createWeek(raspz, 'teacher');

    // use exams
    if (!idSchedule) {
      const qbExam = this.examenRepository
        .createQueryBuilder('e')
        .where('1=1')
        .andWhere('isnull(e.noras, 0) <= 0')
        .andWhere('e.data IS NOT NULL')

        .select('e.data', 'date')
        .addSelect('p.namepredmet', 'lessonName')
        .addSelect('a.nameaudi', 'auditoryName')
        .addSelect('g.namegroup', 'groupName')
        .addSelect('e.note', 'note')

        .leftJoin('audi', 'a', 'a.idaudi = e.idaudi')
        .leftJoin('gruppa', 'g', 'e.idgroup = g.idgroup')
        .leftJoin('predmet', 'p', 'e.idpredmet = p.idpredmet')
        .leftJoin('prep_examen', 'pe', 'pe.idexam = e.idexam');

      qbExam.andWhere('pe.idprep = :id', { id: teacherId });
      const exams: IExamDay[] = await qbExam.getRawMany();
      if (exams.length > 0) {
        this.injectExams(weeks, exams, 'teacher');
      }
    }

    const items = weeks;
    if (items.length === 0) {
      return null;
    }

    const teacherInfo = await this.teacherRepository.findOneBy({
      id: teacherId,
    });
    const teacher = {
      id: teacherId,
      name: teacherInfo?.fio1 || '',
    };

    const response = { teacher, items };
    if (this.allowCaching) {
      await this.writeCache(cacheKey, response, 60 * 5);
    }

    return this.withCacheMetadata(response, false);
  }

  async getByAudience(
    audienceIdOrName: number | string,
    idSchedule: number = 0,
  ) {
    const cacheKey = `byAudience:${idSchedule}:${String(audienceIdOrName).toLowerCase()}`;
    if (this.allowCaching) {
      const cached = await this.readCache<OneWeekDto[]>(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { items: cached.value },
          true,
          cached.ttlSeconds,
        );
      }
    }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      .andWhere('childz = :childz', { childz: 0 })

      .orderBy('datz', 'ASC')
      .addOrderBy('nned', 'ASC')
      .addOrderBy('npar', 'ASC');

    if (!isNaN(Number(audienceIdOrName))) {
      qb.andWhere('(audi = :id OR audi2 = :id)', { id: audienceIdOrName });
    } else {
      qb.andWhere(
        '(LOWER(nameaudi) = LOWER(:name) OR LOWER(nameaudi2) = LOWER(:name))',
        { name: audienceIdOrName },
      );
    }

    if (idSchedule > 0) {
      qb.andWhere('idraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.idraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const raspz = await qb.getMany();
    const weeks = this.createWeek(raspz, 'audience');

    // use exams
    if (!idSchedule) {
      const qbExam = this.examenRepository
        .createQueryBuilder('e')
        .where('1=1')
        .andWhere('isnull(e.noras, 0) <= 0')
        .andWhere('e.data IS NOT NULL')

        .select('e.data', 'date')
        .addSelect('p.namepredmet', 'lessonName')
        .addSelect('a.nameaudi', 'auditoryName')
        .addSelect('g.namegroup', 'groupName')
        .addSelect('pr.fio1', 'teacherName')
        .addSelect('e.note', 'note')

        .leftJoin('audi', 'a', 'a.idaudi = e.idaudi')
        .leftJoin('gruppa', 'g', 'e.idgroup = g.idgroup')
        .leftJoin('predmet', 'p', 'e.idpredmet = p.idpredmet')
        .leftJoin('prep_examen', 'pe', 'pe.idexam = e.idexam')
        .leftJoin('prep', 'pr', 'pe.idprep = pr.idprep');

      if (!isNaN(Number(audienceIdOrName))) {
        qbExam.andWhere('e.idaudi = :id', { id: audienceIdOrName });
      } else {
        qbExam.andWhere('LOWER(a.nameaudi) = LOWER(:name)', {
          name: audienceIdOrName,
        });
      }
      const exams: IExamDay[] = await qbExam.getRawMany();
      if (exams.length > 0) {
        this.injectExams(weeks, exams, 'audience');
      }
    }

    const items = weeks;
    if (items.length === 0) {
      return null;
    }

    if (this.allowCaching) {
      await this.writeCache(cacheKey, items, 60 * 5);
    }

    return this.withCacheMetadata({ items }, false);
  }

  async getTeachersBySchedule(idSchedule: number) {
    const cacheKey = `teachers_schedule:${idSchedule}`;
    if (this.allowCaching) {
      const cached = await this.readCache<
        {
          id: number;
          name: string;
        }[]
      >(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { items: cached.value, count: cached.value.length },
          true,
          cached.ttlSeconds,
        );
      }
    }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      // .andWhere('childz = :childz', { childz: 0 })
      .select('r.prep', 'prep1')
      .addSelect('r.prep2', 'prep2')

      .addSelect('pr_1.fio1', 'teacherName_1')
      .addSelect('pr_2.fio1', 'teacherName_2')
      .leftJoin('prep', 'pr_1', 'r.prep = pr_1.idprep')
      .leftJoin('prep', 'pr_2', 'r.prep2 = pr_2.idprep')

      .groupBy('pr_1.fio1')
      .addGroupBy('r.prep')

      .addGroupBy('pr_2.fio1')
      .addGroupBy('r.prep2')
      // .addGroupBy('r.IDraspz')

      .orderBy('pr_1.fio1', 'ASC')
      .addOrderBy('pr_2.fio1', 'ASC');

    if (idSchedule > 0) {
      qb.andWhere('IDraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.IDraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const map: Map<number, string> = new Map();
    const raspz = (await qb.getRawMany()) as Partial<{
      teacherName_1: string;
      prep1: number;
      teacherName_2: string;
      prep2: number;
    }>[];
    for (const item of raspz) {
      if (item.teacherName_1) {
        map.set(item.prep1, item.teacherName_1);
      }
      if (item.teacherName_2) {
        map.set(item.prep2, item.teacherName_2);
      }
    }

    const items = [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (items.length === 0) {
      return null;
    }

    if (this.allowCaching) {
      await this.writeCache(cacheKey, items, 60 * 5);
    }
    return this.withCacheMetadata({ items, count: items.length }, false);
  }

  async getAudiencesBySchedule(idSchedule: number) {
    const cacheKey = `audiences_schedule:${idSchedule}`;
    if (this.allowCaching) {
      const cached = await this.readCache<
        {
          id: number;
          name: string;
        }[]
      >(cacheKey);
      if (cached) {
        return this.withCacheMetadata(
          { items: cached.value, count: cached.value.length },
          true,
          cached.ttlSeconds,
        );
      }
    }

    const qb = this.raspzViewRepository
      .createQueryBuilder('r')
      .where('1=1')
      // .andWhere('childz = :childz', { childz: 0 })
      .select(['r.nameaudi', 'r.audi'])
      .addSelect(['r.nameaudi2', 'r.audi2'])
      // .addSelect('r.IDraspz')

      .groupBy('r.nameaudi')
      .addGroupBy('r.audi')

      .addGroupBy('r.nameaudi2')
      .addGroupBy('r.audi2')
      // .addGroupBy('r.IDraspz')

      .orderBy('nameaudi', 'ASC')
      .addOrderBy('nameaudi2', 'ASC');

    if (idSchedule > 0) {
      qb.andWhere('IDraspz = :idSchedule', { idSchedule });
    } else {
      qb.innerJoin('raspz_nastr', 'n', 'n.idraspz = r.IDraspz');
      qb.andWhere('n.fl_pub > 0');
    }

    const audiences: Map<number, string> = new Map();
    const raspz = (await qb.getRawMany()) as Partial<{
      nameaudi: string;
      audi: number;
      nameaudi2: string;
      audi2: number;
    }>[];
    for (const item of raspz) {
      if (item.nameaudi) {
        audiences.set(item.audi, item.nameaudi);
      }
      if (item.nameaudi2) {
        audiences.set(item.audi2, item.nameaudi2);
      }
    }

    const items = [...audiences.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (items.length === 0) {
      return null;
    }

    if (this.allowCaching) {
      await this.writeCache(cacheKey, items, 60 * 5);
    }
    return this.withCacheMetadata({ items, count: items.length }, false);
  }

  async getAudiences() {
    return await this.audienceRepository.find({
      // take: 10,
    });
  }

  /**
   * Преобразует публичный идентификатор семестра в доступный для чтения идентификатор.
   * Неопределённый семестр (0) сохраняет прежнее поведение: выбираются все опубликованные.
   */
  async resolvePublicSemesterId(semesterId: number): Promise<number | null> {
    if (semesterId === 0) {
      return 0;
    }

    const semester = await this.scheduleSemesterRepository.findOneBy({
      id: semesterId,
      fl_pub: 1,
    });

    return semester?.id ?? null;
  }

  async getScheduleSemesters(): Promise<ScheduleSemesterDto[]> {
    const semesters = await this.scheduleSemesterRepository.find({
      where: { fl_pub: 1 },
      relations: ['semesterName', 'academicYear'],
      order: {
        academicYearId: 'DESC',
        semesterNameId: 'ASC',
        id: 'DESC',
      },
    });

    return semesters.map((semester) => ({
      id: semester.id,
      academicYear: {
        id: semester.academicYearId ?? null,
        name: semester.academicYear?.name ?? null,
      },
      semester: {
        id: semester.semesterNameId ?? null,
        name: semester.semesterName?.nameperr ?? null,
        number: semester.semesterName?.sem ?? null,
      },
      startsAt: semester.nned_data0 ?? null,
      endsAt: semester.nned_data1 ?? null,
      isPublished: semester.fl_pub > 0,
    }));
  }

  private createWeek(
    raspz: ScheduleView[],
    rType: 'group' | 'teacher' | 'audience',
  ) {
    const parityOnWeekMap: Map<number, WeekParityType> = new Map();
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
      const res =
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
        auditoryName_1,
        auditoryName_2,
        teacherName_1,
        teacherName_2,
        teacherId: teacherId_1,
        teacherId_2,
        groupName,
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
      let { lessonName } = raw;

      let curWeek = weeks.find((e) => e.number === weekNumber);
      if (!curWeek) {
        curWeek = {
          number: weekNumber,
          days: [],
        };
        weeks.push(curWeek);
      }

      let curDay = curWeek.days.find(
        (e) => e.info.date.toString() === date.toString(),
      );
      if (!curDay) {
        curDay = {
          info: {
            type: moment(date).day() - 1,
            weekNumber,
            date,
          },
          lessons: [],
        };
        (curWeek.days as OneDayDto[]).push(curDay);
      }

      const curLesson =
        (streamRefId || rType !== 'group') &&
        curDay.lessons.find(
          (e) =>
            (streamRefId && e.trainingId === streamRefId) ||
            // * Фикс пар, которые не объединили в поток
            (e.startAt.toString() === startAt.toString() &&
              e.duration === academicHours * 2 &&
              e.isDistant === isDistant &&
              e.lessonName === lessonName &&
              e.teacherId === teacherId_1 &&
              e.auditoryName === auditoryName_1),
        );
      if (curLesson) {
        if (rType !== 'group') {
          curLesson.groups.push(groupName);
        }
        continue;
      }

      let number = lessonNumber;
      if (number > 2 || number > 7) {
        --number;
      }

      const durationMinutes = ((f, fixT = 1) => f * 90 + (f - fixT) * 10)(
        Math.floor(academicHours),
        // ! need fix 19:00 при больше чем 3 академ. часах
        academicHours > 1 ? (number === 2 ? -2 : number === 5 ? 0 : 1) : 1,
      );

      let timeRange = timeInterval;
      const [startTime, sourceEndTime] = timeInterval.split('-');
      let endTime = sourceEndTime;
      if (academicHours > 1 && startTime && endTime) {
        const dateTime = new Date(0);
        const ds = startTime.split(':').map(Number);
        dateTime.setHours(ds[0], ds[1]);
        dateTime.setMinutes(dateTime.getMinutes() + durationMinutes);
        endTime = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
        timeRange = `${startTime}-${endTime}`;
      }

      const originalTime =
        academicHours > 1 ? `${startTime}-...${academicHours * 2}ч` : timeRange;

      if (isShort) timeRange += ' [SHORT]';

      const lessonType = analyzeLessonType({
        lessonName,
        lessonTypeShortName,
        additionalInfo,
      });
      lessonName = lessonType.lessonName;
      const { subInfo, type } = lessonType;

      const lesson = new LessonDto({
        trainingId,
        number,
        startAt,
        endAt: new Date(
          startAt.getTime() + durationMinutes * 60e3,
        ).toISOString(),
        timeRange,
        originalTimeTitle: `${lessonNumber}. ${originalTime}`,
        parity: parityOnWeek(trainingId),
        lessonName,
        type,
        isStream: streamRefId > 0,
        duration: academicHours * 2,
        durationMinutes,
        isDivision,
        teacherName: teacherName_1 || undefined,
        teacherId: teacherId_1 || undefined,
        additionalTeacherName: teacherName_2 || undefined,
        additionalTeacherId: teacherId_2 || undefined,
        auditoryName: auditoryName_1 || undefined,
        additionalAuditoryName: auditoryName_2 || undefined,
        // auditoryName:
        //   [auditoryName_1, auditoryName_2].filter(Boolean).join('; ').trim() ||
        //   null,
        isDistant,
        subInfo,
        isShort,
        isLecture: lectureFlag > 0,
      });

      if (rType !== 'group') {
        lesson.groups = [];
        if (groupName) {
          lesson.groups.push(groupName);
        }
      }

      curDay.lessons.push(lesson);
    }

    return weeks;
  }

  private injectExams(
    schedule: OneWeekDto[],
    exams: IExamDay[],
    rType: 'group' | 'teacher' | 'audience' = 'group',
  ) {
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

      const lessonFormat = new LessonDto({
        startAt: exam.date,
        endAt: moment(exam.date).add(23, 'hour').toDate(),

        number: null,
        timeRange: null,
        parity: null,

        lessonName: exam.lessonName,
        type: LessonFlags.Exam,

        originalTimeTitle: null,
        isStream: false,
        duration: null,
        durationMinutes: null,
        isDivision: false,
        auditoryName: exam.auditoryName,
        subInfo: exam.note,
      });

      if (rType !== 'group') {
        lessonFormat.groups = [];
        if (exam.groupName) {
          lessonFormat.groups.push(exam.groupName);
        }
      }
      if (rType !== 'teacher') {
        lessonFormat.teacherName = exam.teacherName;
      }

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
