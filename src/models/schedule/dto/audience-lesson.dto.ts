import { plainToClass } from 'class-transformer';
import { LessonDto } from './lesson.dto';

export class AudienceLessonDto extends LessonDto {
  /**
   * Названия групп
   */
  groups: string[];

  constructor(input?: Partial<AudienceLessonDto>) {
    super();
    if (input) {
      Object.assign(this, plainToClass(AudienceLessonDto, input));
    }
  }
}
