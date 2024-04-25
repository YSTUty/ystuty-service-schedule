import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { trimTransformer } from '@my-common';
import { Exam, Department } from '.';

/**
 * @example `
 * idaudi	idvidaudi	idkaf	nameaudi	kolvo	korpus	sq	date0	date1	primech	abrkaf	prsess	idmedia	floor
 * 607	18	506	Г-501	NULL	Г	NULL	2024-01-09 00:00:00.000	2024-01-27 00:00:00.000	NULL	NULL	1	NULL	5
 * 488	32	NULL	Г-812	66	Г	51.00	2024-01-09 00:00:00.000	2024-01-27 00:00:00.000	Заочники	          	1	1	8
 * `
 */
@Entity({ name: 'audi' })
@Exclude()
export class Auditory {
  @Expose()
  @PrimaryColumn({ name: 'idaudi' })
  public id: number;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idvidaudi' })
  public auditoryTypeId: number;

  // @Expose()
  // @JoinColumn({ name: 'idvidaudi' })
  // @ManyToOne(() => VidAudi, (e) => e.audis)
  // public auditoryType: VidAudi;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idkaf', nullable: true })
  public departmentId: number;

  @Expose()
  @JoinColumn({ name: 'idkaf' })
  @ManyToOne(() => Department, (e) => e.auditories)
  public department: Department;

  @Expose()
  @Column({ name: 'nameaudi', nullable: true })
  public name: string;

  @Expose()
  @Column({ name: 'kolvo', nullable: true })
  public kolvo: number;

  /**
   * @example `Г`
   */
  @Expose()
  @Column({ name: 'korpus', nullable: true })
  public buildingName: string;

  /**
   * @example `51.00`
   */
  @Expose()
  @Column({ name: 'sq', nullable: true })
  public sq: number;

  @Expose()
  @Column({ name: 'date0', nullable: true })
  public date0: Date;

  @Expose()
  @Column({ name: 'date1', nullable: true })
  public date1: Date;

  @Expose()
  @Column({ name: 'primech', nullable: true, transformer: trimTransformer })
  public note: string;

  @Expose()
  @Column({
    name: 'abrkaf',
    nullable: true,
    transformer: trimTransformer,
  })
  public departmentShortName: string;

  @Expose()
  @Column({ name: 'prsess', nullable: true })
  public prsess: number;

  // @Expose()
  // @Column({ name: 'timestamp', type: 'timestamp', nullable: true })
  // public timestamp: number;

  @Expose({ toClassOnly: true })
  @Column({ name: 'idmedia', nullable: true })
  public idmedia: number;

  // @Expose()
  // @JoinColumn({ name: 'idmedia' })
  // @ManyToOne(() => NMedia, (e) => e.audis)
  // public media: NMedia;

  @Expose()
  @Column({ name: 'floor', nullable: true })
  public floor: number;

  @Expose()
  @OneToMany(() => Exam, (e) => e.auditory)
  public exams: Exam[];

  // @Expose()
  // @OneToMany(() => Raspz, (e) => e.audi)
  // public raspzs: Raspz[];

  constructor(input?: Omit<Partial<Auditory>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(Auditory, input));
    }
  }
}
