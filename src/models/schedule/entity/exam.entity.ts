import {
  Entity,
  Column,
  PrimaryColumn,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Auditory, Group, AcademicSubject, Teacher, Department } from '.';

@Entity({ name: 'examen' })
@Exclude()
export class Exam {
  @Expose()
  @PrimaryColumn({ name: 'idexam' })
  public id: number;

  @Expose()
  @ManyToMany(() => Teacher, (e) => e.exams)
  @JoinTable({
    name: 'prep_examen',
    joinColumn: {
      name: 'idexam',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'idprep',
      referencedColumnName: 'id',
    },
  })
  public teachers: Teacher[];

  @Expose({ toClassOnly: true })
  @Column({ name: 'idplatform', nullable: true })
  public idplatform: number;

  // @Expose()
  // @JoinColumn({ name: 'idplatform' })
  // @ManyToOne(() => NPlatform, (e) => e.exams)
  // public platform: NPlatform;

  @Expose()
  @Column({ name: 'parent', nullable: true })
  public parent: number;

  // @Expose()
  // @JoinColumn({ name: 'parent' })
  // @ManyToOne(() => Examen)
  // public parent: Examen;

  @Expose()
  @Column({ name: 'child', nullable: true })
  public child: number;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idpredmet' })
  public academicSubjectId: number;

  @Expose()
  @JoinColumn({ name: 'idpredmet' })
  @ManyToOne(() => AcademicSubject, (e) => e.exams)
  public academicSubject: AcademicSubject;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idgroup' })
  public groupId: number;

  @Expose()
  @JoinColumn({ name: 'idgroup' })
  @ManyToOne(() => Group, (e) => e.exams)
  public group: Group;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idaudi', nullable: true })
  public auditoryId: number;

  @Expose()
  @JoinColumn({ name: 'idaudi' })
  @ManyToOne(() => Auditory, (e) => e.exams)
  public auditory: Auditory;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idkaf', nullable: true })
  public departmentId: number;

  @Expose()
  @JoinColumn({ name: 'idkaf' })
  @ManyToOne(() => Department, (e) => e.exams)
  public department: Department;

  @Expose()
  @Column({ name: 'data', nullable: true })
  public data: Date;

  @Expose()
  @Column({ name: 'zakaudi', nullable: true })
  public zakaudi: number;

  @Expose()
  @Column({ name: 'zakday', nullable: true })
  public zakday: number;

  @Expose()
  @Column({ name: 'kols', nullable: true })
  public kols: number;

  @Expose()
  @Column({ name: 'primech', nullable: true })
  public note: string;

  public timestamp: string;

  @Expose()
  @Column({ name: 'noras', type: 'tinyint', nullable: true })
  public noras: number;

  @Expose()
  @Column({ name: 'zakaudi1', type: 'int', nullable: true })
  public zakaudi1: number;

  @Expose()
  @Column({ name: 'zakaudi2', type: 'tinyint', nullable: true })
  public zakaudi2: number;

  @Expose()
  @Column({ name: 'handadd', type: 'tinyint', nullable: true })
  public handadd: number;

  @Expose()
  @Column({ name: 'primech1', nullable: true })
  public note_1: string;

  @Expose()
  @Column({ name: 'LastUpdate', nullable: true })
  public lastUpdate: string;

  @Expose()
  @Column({ name: 'LastRasch', nullable: true })
  public lastCalculating: string;

  @Expose()
  @Column({ name: 'primo', nullable: true })
  public primo: string;

  constructor(input?: Omit<Partial<Exam>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(Exam, input));
    }
  }
}
