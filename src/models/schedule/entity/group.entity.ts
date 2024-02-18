import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Exam, FacultyInstitute } from '.';

@Entity({ name: 'gruppa' })
@Exclude()
export class Group {
  @Expose()
  @PrimaryColumn({ name: 'idgroup' })
  public id: number;

  @Expose()
  @Column({ name: 'idfac' })
  public facultyId: number;

  @Expose()
  @JoinColumn({ name: 'idfac' })
  @ManyToOne(() => FacultyInstitute, (e) => e.groups)
  public faculty: FacultyInstitute;

  @Expose()
  @Column({ name: 'namegroup', nullable: true })
  public name: string;

  @Expose()
  @Column({ name: 'kolvo', nullable: true })
  public kolvo: number;

  @Expose()
  @Column({ name: 'kolspec', nullable: true })
  public kolspec: number;

  @Expose()
  @Column({ name: 'date0', nullable: true })
  public date0: Date;

  @Expose()
  @Column({ name: 'date1', nullable: true })
  public date1: Date;

  @Expose()
  @Column({ name: 'kurs', nullable: true })
  public courseNumber: number;

  @Expose()
  @Column({ name: 'spec', nullable: true })
  public specialityId: number;

  @Expose()
  @Column({ name: 'ves', nullable: true })
  public ves: number;

  @Expose()
  @Column({ name: 'krit', nullable: true })
  public krit: number;

  @Expose()
  @Column({ name: 'handadd', type: 'tinyint', nullable: true })
  public handadd: number;

  @Expose()
  @Column({ name: 'primech1', nullable: true })
  public note: string;

  @Expose()
  @Column({ name: 'namespec', nullable: true })
  public specialityName: string;

  @Expose()
  @OneToMany(() => Exam, (e) => e.group)
  public exams: Exam[];

  constructor(input?: Omit<Partial<Group>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(Group, input));
    }
  }
}
