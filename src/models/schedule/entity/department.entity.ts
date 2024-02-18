import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { AcademicSubject, Auditory, Exam, FacultyInstitute, Teacher } from '.';

@Entity({ name: 'kafedry' })
@Exclude()
export class Department {
  /**
   * @example `506`
   */
  @Expose()
  @PrimaryColumn({ name: 'idkaf' })
  public id: number;

  /**
   * @example `5`
   */
  @Expose()
  @Column({ name: 'idfac' })
  public facultyInstituteId: number;

  @Expose()
  @JoinColumn({ name: 'idfac' })
  @ManyToOne(() => FacultyInstitute, (e) => e.department)
  public facultyInstitute: FacultyInstitute;

  /**
   * @example `Информационные системы и технологии`
   */
  @Expose()
  @Column({ name: 'namekaf', nullable: true })
  public name: string;

  /**
   * @example `Бойков СЮ`
   */
  @Expose()
  @Column({ name: 'fio_zav', nullable: true })
  public headFullName: number;

  /**
   * @example `Г`
   */
  @Expose()
  @Column({ name: 'korpus', nullable: true })
  public buildingName: string;

  /**
   * @example `ИСТ`
   */
  @Expose()
  @Column({ name: 'abrkaf', nullable: true })
  public departmentShortName: string;

  /**
   * @example `16780460`
   */
  @Expose()
  @Column({ name: 'idpodr' })
  public idpodr: number;

  // @Expose()
  // @OneToOne(() => Podr, (e) => e.kafedry)
  // public podr: Podr;

  /**
   * @example `NULL` | `0` | `1`
   */
  @Expose()
  @Column({ name: 'disabled', type: 'bit', nullable: true })
  public disabled: number;

  @Expose()
  @OneToMany(() => Teacher, (e) => e.department)
  public teachers: Teacher[];

  @Expose()
  @OneToMany(() => Auditory, (e) => e.department)
  public auditories: Auditory[];

  @Expose()
  @OneToMany(() => Exam, (e) => e.department)
  public exams: Exam[];

  @Expose()
  @OneToMany(() => AcademicSubject, (e) => e.department)
  public predmets: AcademicSubject[];

  constructor(input?: Omit<Partial<Department>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(Department, input));
    }
  }
}
