import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { ScheduleSemester } from '.';

@Entity({ name: 'ugod' })
@Exclude()
export class AcademicYear {
  @Expose()
  @PrimaryColumn({ name: 'oid' })
  public id: number;

  @Expose()
  @Column({ name: 'name', nullable: true })
  public name: string;

  @Expose()
  @Column({ name: 'start', nullable: true })
  public start: Date;

  @Expose()
  @Column({ name: 'finish', nullable: true })
  public finish: Date;

  @Expose()
  @OneToMany(() => ScheduleSemester, (e) => e.academicYear)
  public scheduleSemesters: ScheduleSemester[];

  constructor(input?: Omit<Partial<AcademicYear>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(AcademicYear, input));
    }
  }
}
