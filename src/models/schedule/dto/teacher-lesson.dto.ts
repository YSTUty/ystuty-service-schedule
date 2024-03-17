import { plainToClass } from 'class-transformer';
import { OmitType } from '@nestjs/swagger';
import { LessonDto } from './lesson.dto';

export class TeacherLessonDto extends OmitType(LessonDto, ['teacherName']) {
  /**
   * Названия групп
   */
  groups: string[];

  additionalTeacher?: {
    name: string;
    id: number;
  };

  constructor(input?: Partial<TeacherLessonDto>) {
    super();
    if (input) {
      Object.assign(this, plainToClass(TeacherLessonDto, input));
    }
  }
}
