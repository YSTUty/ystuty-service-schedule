import { Exclude, Expose, plainToClass } from 'class-transformer';
import { ViewEntity, ViewColumn, ManyToOne, JoinColumn } from 'typeorm';

import {
  AcademicSubject,
  Auditory,
  Department,
  FacultyInstitute,
  Teacher,
} from '.';

@ViewEntity({ name: 'raspzv' })
@Exclude()
export class ScheduleView {
  /**
   * Только дата с нудеым временем
   * @example 2024-05-31 00:00:00.000
   */
  @Expose()
  @ViewColumn({ name: 'datz' })
  public date: Date;

  /**
   * Дата и время начала пары
   * @example 2024-05-31 08:30:00.000
   */
  @Expose()
  @ViewColumn({ name: 'datt' })
  public startAt: Date;

  @Expose()
  @ViewColumn({ name: 'namepar' })
  public timeInterval: string;

  @Expose()
  @ViewColumn({ name: 'f_perr' })
  public f_perr: boolean;

  @Expose()
  @ViewColumn({ name: 'namegr' })
  public groupName: string;

  // @Expose()
  // @ViewColumn({ name: 'ngrk' })
  // public ngrk: string;

  @Expose()
  @ViewColumn({ name: 'kurs' })
  public courseNumber: number;

  @Expose()
  @ViewColumn({ name: 'idfac' })
  public facultyInstituteId: number;

  @Expose()
  @JoinColumn({ name: 'idfac' })
  @ManyToOne(() => FacultyInstitute)
  public facultyInstitute?: FacultyInstitute;

  @Expose()
  @ViewColumn({ name: 'fl_lek' })
  public lectureFlag: number;

  /**
   * @example '37' | '24' | '24м'
   */
  @Expose()
  @ViewColumn({ name: 'ng' })
  public groupNumber: string;

  @Expose()
  @ViewColumn({ name: 'namepredm' })
  public lessonName: string;

  @Expose()
  @ViewColumn({ name: 'IDkaf' })
  public departmentId: number;

  @Expose()
  @JoinColumn({ name: 'idkaf' })
  @ManyToOne(() => Department)
  public department?: Department;

  /**
   * @example `ИСТ`
   */
  @Expose()
  @ViewColumn({ name: 'abrkaf' })
  public departmentShortName: string;

  @Expose()
  @ViewColumn({ name: 'fio1' })
  public teacherName_1: string;

  @Expose()
  @ViewColumn({ name: 'fio2' })
  public teacherName_2: string;

  @Expose()
  @ViewColumn({ name: 'fiopreps' })
  public fiopreps: string;

  @Expose()
  @ViewColumn({ name: 'namewz' })
  public lessonTypeName: string;

  @Expose()
  @ViewColumn({ name: 'abrwz' })
  public lessonTypeShortName: string;

  @Expose()
  @ViewColumn({ name: 'nameaudi' })
  public auditoryName_1: string;

  @Expose()
  @ViewColumn({ name: 'nameaudi2' })
  public auditoryName_2: string;

  @Expose()
  @ViewColumn({ name: 'IDr' })
  public IDr: number;

  @Expose()
  @ViewColumn({ name: 'IDraspz' })
  public IDraspz: number;

  // @Expose()
  // @JoinColumn({ name: 'IDraspz' })
  // @ManyToOne(() => RaspzNastr )
  // public raspz: RaspzNastr;

  @Expose()
  @ViewColumn({ name: 'idgr' })
  public groupId: number;

  // @Expose()
  // @JoinColumn({ name: 'idgr' })
  // @ManyToOne(() => RGruppa )
  // public rGroup: RGruppa;

  @Expose()
  @ViewColumn({ name: 'IDz' })
  public trainingId: number;

  @Expose()
  @ViewColumn({ name: 'IDpredmet' })
  public academicSubjectId: number;

  @Expose()
  @JoinColumn({ name: 'IDpredmet' })
  @ManyToOne(() => AcademicSubject)
  public academicSubject?: AcademicSubject;

  @Expose()
  @ViewColumn({ name: 'wz' })
  public wz: number;

  // @Expose()
  // @JoinColumn({ name: 'wz' })
  // @ManyToOne(() => NWidzan )
  // public lessonType: NWidzan;

  @Expose()
  @ViewColumn({ name: 'nned' })
  public weekNumber: number;

  /**
   * Номер дня недели
   */
  @Expose()
  @ViewColumn({ name: 'ndow' })
  public dayNumber: number;

  @Expose()
  @ViewColumn({ name: 'npar' })
  public lessonNumber: number;

  @Expose()
  @ViewColumn({ name: 'kolpar' })
  public academicHours: number;

  /**
   * ID связанного расписания для объединения в поток
   */
  @Expose()
  @ViewColumn({ name: 'potok' })
  public streamRefId: number;

  @Expose()
  @ViewColumn({ name: 'childz' })
  public childFlag: number;

  @Expose()
  @ViewColumn({ name: 'popg' })
  public isDivision: boolean;

  @Expose()
  @ViewColumn({ name: 'prep' })
  public prep: number;

  @Expose()
  @JoinColumn({ name: 'prep' })
  @ManyToOne(() => Teacher)
  public teacher?: Teacher;

  @Expose()
  @ViewColumn({ name: 'prep2' })
  public teacherId_2: number;

  @Expose()
  @JoinColumn({ name: 'prep2' })
  @ManyToOne(() => Teacher)
  public teacher2?: Teacher;

  @Expose()
  @ViewColumn({ name: 'audi' })
  public auditoryId: number;

  @Expose()
  @JoinColumn({ name: 'audi' })
  @ManyToOne(() => Auditory)
  public auditory?: Auditory;

  @Expose()
  @ViewColumn({ name: 'audi2' })
  public auditoryId_2: number;

  @Expose()
  @JoinColumn({ name: 'audi2' })
  @ManyToOne(() => Auditory)
  public auditory2?: Auditory;

  @Expose()
  @ViewColumn({ name: 'prim' })
  public note: string;

  // @Expose()
  // @ViewColumn({ name: 'hours_red' })
  // public hours_red: number;

  @Expose()
  @ViewColumn({ name: 'rtext' })
  public additionalInfo: string;

  @Expose()
  @ViewColumn({ name: 'datzs' })
  public datzs: Date;

  @Expose()
  @ViewColumn({ name: 'cdatt' })
  public cdatt: string;

  @Expose()
  @ViewColumn({ name: 'distant' })
  public isDistant: boolean;

  @Expose()
  @ViewColumn({ name: 'short' })
  public isShort: boolean;

  @Expose()
  @ViewColumn({ name: 'ch' })
  public ch: boolean;

  constructor(input?: Omit<Partial<ScheduleView>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(ScheduleView, input));
    }
  }
}
