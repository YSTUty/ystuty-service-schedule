import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Exclude, Expose, plainToClass } from 'class-transformer';

import { Department, Group } from '.';

@Entity({ name: 'fullfac' })
@Exclude()
export class FacultyInstitute {
  @Expose()
  @PrimaryColumn({ name: 'idfac' })
  public id: number;

  @Expose()
  @Column({ name: 'kod' })
  public code: string;

  @Expose()
  @Column({ name: 'namefac' })
  public name: string;

  @Expose()
  @Column({ name: 'head_fio', nullable: true })
  public headFullName: string;

  @Expose()
  @Column({ name: 'head_dolg', nullable: true })
  public headPost: string;

  @Expose()
  @Column({ name: 'typfac', nullable: true })
  public type: number;

  // @Expose()
  // @OneToMany(() => RGruppa, (e) => e.fac)
  // public rGroups: RGruppa[];

  @Expose()
  @OneToMany(() => Group, (e) => e.faculty)
  public groups: Group[];

  @Expose()
  @OneToMany(() => Department, (e) => e.facultyInstitute)
  public department: Department[];

  constructor(input?: Omit<Partial<FacultyInstitute>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(FacultyInstitute, input));
    }
  }
}
