import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { analyzeLessonType, getLessonTypeStrArr } from '@my-common';
import { LessonFlags } from '@my-interfaces';

import { ScheduleView } from '../entity';

interface ScheduleLessonTypeFormatRaw {
  occurrences: number | string;
  groupsCount: number | string;
  sampleEntryId: number;
  lessonName: string;
  lessonTypeName: string;
  lessonTypeShortName: string;
  additionalInfo: string;
}

interface ScheduleLessonTypeSampleRaw {
  scheduleEntryId: number;
  semesterId: number;
  groupId: number;
  groupName: string;
  instituteId: number;
  instituteName: string;
  lessonName: string;
  lessonTypeName: string;
  lessonTypeShortName: string;
  additionalInfo: string;
  startsAt: Date;
  timeRange: string;
  isDistant: boolean | number;
  teacherName: string;
  auditoryName: string;
}

interface LessonTypeFormatSample {
  scheduleEntryId: number;
  semesterId: number;
  group: {
    id: number;
    name: string;
  };
  institute: {
    id: number;
    name: string;
  };
  startsAt: Date;
  timeRange: string;
  isDistant: boolean;
  teacherName: string | null;
  auditoryName: string | null;
}

interface LessonTypeFormatDiagnostics {
  occurrences: number;
  groupsCount: number;
  raw: {
    lessonName: string | null;
    lessonTypeName: string | null;
    lessonTypeShortName: string | null;
    additionalInfo: string | null;
  };
  normalized: {
    lessonName: string | null;
    subInfo: string | null;
    flags: LessonFlags;
    labels: string[];
    isUnsupported: boolean;
  };
  sample: LessonTypeFormatSample | null;
}

export interface ScheduleLessonTypeDiagnosticsReport {
  year: number;
  dateRange: {
    from: string;
    to: string;
  };
  summary: {
    untypedRows: number;
    untypedFormats: number;
    unsupportedRows: number;
    unsupportedFormats: number;
  };
  formats: LessonTypeFormatDiagnostics[];
}

/**
 * Собирает компактный отчёт о занятиях без указанного типа. Агрегация
 * выполняется в MSSQL, чтобы не передавать все строки расписания в Node.js.
 */
@Injectable()
export class ScheduleLessonTypeDiagnosticsService {
  constructor(
    @InjectRepository(ScheduleView)
    private readonly scheduleViewRepository: Repository<ScheduleView>,
  ) {}

  async getLessonTypeReport(): Promise<ScheduleLessonTypeDiagnosticsReport> {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const nextYearStart = `${year + 1}-01-01`;
    const sourceFormats = (await this.scheduleViewRepository
      .createQueryBuilder('r')
      .innerJoin('raspz_nastr', 'n', 'n.idraspz = r.IDraspz')
      .select('r.namepredm', 'lessonName')
      .addSelect('r.namewz', 'lessonTypeName')
      .addSelect('r.abrwz', 'lessonTypeShortName')
      .addSelect('r.rtext', 'additionalInfo')
      .addSelect('COUNT(1)', 'occurrences')
      .addSelect('COUNT(DISTINCT r.idgr)', 'groupsCount')
      .addSelect('MIN(r.IDr)', 'sampleEntryId')
      .where('r.childz = :childFlag', { childFlag: 0 })
      .andWhere('n.fl_pub > 0')
      // Ограничиваем отчёт актуальным календарным годом, чтобы старые
      // опубликованные семестры не влияли на диагностику новых форматов.
      .andWhere('r.datz >= :yearStart AND r.datz < :nextYearStart', {
        yearStart,
        nextYearStart,
      })
      .andWhere("(r.abrwz IS NULL OR LTRIM(RTRIM(r.abrwz)) = '')")
      .groupBy('r.namepredm')
      .addGroupBy('r.namewz')
      .addGroupBy('r.abrwz')
      .addGroupBy('r.rtext')
      .getRawMany()) as ScheduleLessonTypeFormatRaw[];

    const sampleEntryIds = sourceFormats
      .map((format) => format.sampleEntryId)
      .filter(Boolean);
    const samples = sampleEntryIds.length
      ? ((await this.scheduleViewRepository
          .createQueryBuilder('r')
          .leftJoin('fullfac', 'f', 'f.idfac = r.idfac')
          .select('r.IDr', 'scheduleEntryId')
          .addSelect('r.IDraspz', 'semesterId')
          .addSelect('r.idgr', 'groupId')
          .addSelect('r.namegr', 'groupName')
          .addSelect('r.idfac', 'instituteId')
          .addSelect('f.namefac', 'instituteName')
          .addSelect('r.datz', 'startsAt')
          .addSelect('r.namepar', 'timeRange')
          .addSelect('r.distant', 'isDistant')
          .addSelect('r.fio1', 'teacherName')
          .addSelect('r.nameaudi', 'auditoryName')
          .where('r.IDr IN (:...sampleEntryIds)', { sampleEntryIds })
          .getRawMany()) as ScheduleLessonTypeSampleRaw[])
      : [];
    const samplesByEntryId = new Map(
      samples.map((sample) => [sample.scheduleEntryId, sample]),
    );
    const result: LessonTypeFormatDiagnostics[] = [];

    for (const sourceFormat of sourceFormats) {
      const lessonType = analyzeLessonType({
        lessonName: sourceFormat.lessonName,
        lessonTypeShortName: sourceFormat.lessonTypeShortName,
        additionalInfo: sourceFormat.additionalInfo,
      });
      const isUnsupported = Boolean(lessonType.type & LessonFlags.Unsupported);

      if (isUnsupported) {
        const sourceSample = samplesByEntryId.get(sourceFormat.sampleEntryId);
        result.push({
          occurrences: Number(sourceFormat.occurrences),
          groupsCount: Number(sourceFormat.groupsCount),
          raw: {
            lessonName: sourceFormat.lessonName ?? null,
            lessonTypeName: sourceFormat.lessonTypeName ?? null,
            lessonTypeShortName: sourceFormat.lessonTypeShortName ?? null,
            additionalInfo: sourceFormat.additionalInfo ?? null,
          },
          normalized: {
            lessonName: lessonType.lessonName ?? null,
            subInfo: lessonType.subInfo ?? null,
            flags: lessonType.type,
            labels: getLessonTypeStrArr(lessonType.type),
            isUnsupported: true,
          },
          sample: sourceSample
            ? {
                scheduleEntryId: sourceSample.scheduleEntryId,
                semesterId: sourceSample.semesterId,
                group: {
                  id: sourceSample.groupId,
                  name: sourceSample.groupName,
                },
                institute: {
                  id: sourceSample.instituteId,
                  name: sourceSample.instituteName,
                },
                startsAt: sourceSample.startsAt,
                timeRange: sourceSample.timeRange,
                isDistant: Boolean(sourceSample.isDistant),
                teacherName: sourceSample.teacherName ?? null,
                auditoryName: sourceSample.auditoryName ?? null,
              }
            : null,
        });
      }
    }

    result.sort(
      (left, right) =>
        right.occurrences - left.occurrences ||
        (left.raw.lessonTypeShortName || '').localeCompare(
          right.raw.lessonTypeShortName || '',
        ) ||
        (left.raw.lessonName || '').localeCompare(right.raw.lessonName || ''),
    );

    return {
      year,
      dateRange: {
        from: yearStart,
        to: nextYearStart,
      },
      summary: {
        untypedRows: sourceFormats.reduce(
          (total, format) => total + Number(format.occurrences),
          0,
        ),
        untypedFormats: sourceFormats.length,
        unsupportedRows: result.reduce(
          (total, format) => total + format.occurrences,
          0,
        ),
        unsupportedFormats: result.length,
      },
      formats: result,
    };
  }
}
