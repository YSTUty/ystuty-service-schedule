import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Exam, Department } from '.';

@Entity({ name: 'predmet' })
@Exclude()
export class AcademicSubject {
  @Expose()
  @PrimaryColumn({ name: 'idpredmet' })
  public id: number;

  @Expose()
  @Column({ name: 'namepredmet' })
  public namepredmet: string;

  @Expose()
  @Column({ name: 'longname', nullable: true })
  public longname: string;

  @Expose({ toClassOnly: true })
  @Column({ name: 'IDkaf', nullable: true })
  public departmentId: number;

  @Expose()
  @JoinColumn({ name: 'IDkaf' })
  @ManyToOne(() => Department, (e) => e.predmets)
  public department: Department;

  @Expose()
  @Column({ name: 'handadd', type: 'tinyint', nullable: true })
  public handadd: number;

  @Expose()
  @OneToMany(() => Exam, (e) => e.academicSubject)
  public exams: Exam[];

  // @Expose()
  // @OneToMany(() => Raspz, (e) => e.predmet)
  // public schedule: Raspz[];

  constructor(input?: Omit<Partial<AcademicSubject>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(AcademicSubject, input));
    }
  }
}
