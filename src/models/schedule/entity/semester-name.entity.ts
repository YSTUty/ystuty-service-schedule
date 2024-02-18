import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { ScheduleSemester } from '.';

@Entity({ name: 'n_perr' })
@Exclude()
export class SemesterName {
  @Expose()
  @PrimaryColumn({ name: 'IDperr' })
  public id: number;

  @Expose()
  @Column({ name: 'nameperr', nullable: true })
  public nameperr: string;

  @Expose()
  @Column({ name: 'sem', nullable: true })
  public sem: number;

  @Expose()
  @Column({ name: 'sess', nullable: true })
  public sess: number;

  @Expose()
  @Column({ name: 'facs', nullable: true })
  public facs: string;

  @Expose()
  @Column({ name: 'f_perr', type: 'bit', nullable: true })
  public f_perr: number;

  @Expose()
  @Column({ name: 'f_regl', type: 'bit', nullable: true })
  public f_regl: number;

  @Expose()
  @OneToMany(() => ScheduleSemester, (e) => e.semesterName)
  public scheduleSemesters: ScheduleSemester[];

  constructor(input?: Omit<Partial<SemesterName>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(SemesterName, input));
    }
  }
}
