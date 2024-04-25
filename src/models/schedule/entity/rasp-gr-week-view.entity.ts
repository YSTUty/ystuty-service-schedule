import { Exclude, Expose, Transform, plainToClass } from 'class-transformer';
import { ViewEntity, ViewColumn } from 'typeorm';
import { trimTransformer } from '@my-common';

// @idraspz int=2, @idgr int=15, @ndow int = 1, @lek int =0
@ViewEntity({
  name: 'GetRaspGrWeek(:idraspz, :idgr, :ndow, :lek)',
})
@Exclude()
export class RaspGrWeekView {
  // @Expose()
  // @ViewColumn({ name: 'thisned' })
  // public thisned: number;

  @Expose()
  @ViewColumn({ name: 'npar' })
  public lessonNumber: number;

  @Expose()
  @ViewColumn({ name: 'idz' })
  public trainingId: number;

  @Expose()
  @ViewColumn({ name: 'namepar' })
  public timeInterval: string;

  @Expose()
  @ViewColumn({ name: 'textz' })
  public textz: string;

  @Expose()
  @ViewColumn({ name: 'textz1' })
  public textz1: string;

  @Expose()
  @ViewColumn({ name: 'neds' })
  public weeks: string;

  @Expose()
  @ViewColumn({ name: 'nedd' })
  public weeksDistant: string;

  @Expose()
  @ViewColumn({ name: 'namepredm', transformer: trimTransformer })
  public lessonName: string;

  @Expose()
  @ViewColumn({ name: 'wz' })
  public lessonTypeStr: string;

  @Expose()
  @ViewColumn({ name: 'rtext' })
  public additionalInfo: string;

  @Expose()
  @ViewColumn({ name: 'short' })
  @Transform((params) => params.value === 1)
  public isShort: boolean;

  // @ViewColumn({ name: 'tshort' })
  // public strIsShort: string;

  @Expose()
  @ViewColumn({ name: 'nameaudi', transformer: trimTransformer })
  public auditoryName: string;

  @Expose()
  @ViewColumn({ name: 'fioprep', transformer: trimTransformer })
  public fioprep: string;

  @Expose()
  @ViewColumn({ name: 'wred' })
  public wred: string;

  constructor(input?: Omit<Partial<RaspGrWeekView>, 'toResponseObject'>) {
    if (input) {
      Object.assign(this, plainToClass(RaspGrWeekView, input));
    }
  }
}
