import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Exam, Department } from '.';

@Entity({ name: 'prep' })
@Exclude()
export class Teacher {
  @Expose()
  @PrimaryColumn({ name: 'idprep' })
  public id: number;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idkaf', nullable: true })
  public departmentId: number;

  @Expose()
  @JoinColumn({ name: 'idkaf' })
  @ManyToOne(() => Department, (e) => e.teachers)
  public department: Department;

  @Expose()
  @Column({ name: 'fam', nullable: true })
  public lastname: string;

  @Expose()
  @Column({ name: 'imja', nullable: true })
  public firstname: string;

  @Expose()
  @Column({ name: 'otch', nullable: true })
  public patronymic: string;

  @Expose()
  @Column({ name: 'tab', nullable: true })
  public employeeNumber: string;

  @Expose()
  @Column({ name: 'fio', nullable: true })
  public fio: string;

  @Expose()
  @Column({ name: 'fio1', nullable: true })
  public fio1: string;

  @Expose()
  @Column({ name: 'dolgn', nullable: true })
  public post: string;

  @Expose()
  @Column({ name: 'primech', nullable: true })
  public note: string;

  // public timestamp: string;

  @Expose()
  @Column({ name: 'Lastupdate', nullable: true })
  public lastUpdate: string;

  @Expose()
  @Column({ name: 'fl_dis', type: 'bit', nullable: true })
  public fl_dis: number;

  @Expose()
  @ManyToMany(() => Exam, (e) => e.teachers)
  public exams: Exam[];

  // @Expose()
  // @OneToMany(() => PrepBusy, (e) => e.teacher)
  // public busy: PrepBusy[];

  // @Expose()
  // @OneToMany(() => Raspz, (e) => e.teacher)
  // public raspzs: Raspz[];

  constructor(input?: Omit<Partial<Teacher>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(Teacher, input));
    }
  }
}
