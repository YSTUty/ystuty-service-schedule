import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { AcademicYear, SemesterName } from '.';

@Entity({ name: 'raspz_nastr' })
@Exclude()
export class ScheduleSemester {
  @Expose()
  @PrimaryColumn({ name: 'idraspz' })
  public id: number;

  @Expose()
  @Column({ name: 'ugod', nullable: true })
  public academicYearId: number;

  @Expose()
  @JoinColumn({ name: 'ugod' })
  @ManyToOne(() => AcademicYear, (e) => e.scheduleSemesters)
  public academicYear: AcademicYear;

  @Expose()
  @Column({ name: 'IDperr', nullable: true })
  public semesterNameId: number;

  @Expose()
  @JoinColumn({ name: 'IDperr' })
  @ManyToOne(() => SemesterName, (e) => e.scheduleSemesters)
  public semesterName: SemesterName;

  @Expose()
  @Column({ name: 'nned_data0', nullable: true })
  public nned_data0: Date;

  @Expose()
  @Column({ name: 'nned_data1', nullable: true })
  public nned_data1: Date;

  @Expose()
  @Column({ name: 'nned_last', nullable: true })
  public nned_last: number;

  @Expose()
  @Column({ name: 'fl_closed', type: 'bit', nullable: true })
  public fl_closed: number;

  @Expose()
  @Column({ name: 'fl_pub', type: 'bit', nullable: true })
  public fl_pub: number;

  @Expose()
  @Column({ name: 'fl_trace', nullable: true })
  public fl_trace: number;

  @Expose()
  @Column({ name: 'LastUpdate', nullable: true })
  public lastUpdate: string;

  @Expose()
  @Column({ name: 'primech', nullable: true })
  public primech: string;

  // @Expose()
  // @OneToMany(() => Raspz, (e) => e.raspz)
  // public raspzs: Raspz[];

  constructor(input?: Omit<Partial<ScheduleSemester>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(ScheduleSemester, input));
    }
  }
}
