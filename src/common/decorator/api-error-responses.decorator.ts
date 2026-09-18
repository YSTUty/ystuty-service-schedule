import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../dto';

const errorDescriptions: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Некорректные параметры запроса',
  [HttpStatus.UNAUTHORIZED]: 'Требуется авторизация',
  [HttpStatus.FORBIDDEN]: 'Недостаточно прав или scope',
  [HttpStatus.NOT_FOUND]: 'Запрошенный ресурс не найден',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'Метод не поддерживается ресурсом',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Превышен лимит запросов',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервиса',
};

/**
 * Добавляет в OpenAPI фактически используемый единый формат ошибок.
 */
export const ApiErrorResponses = (
  ...statuses: HttpStatus[]
): ClassDecorator & MethodDecorator =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: errorDescriptions[status],
        type: ApiErrorResponseDto,
      }),
    ),
  );
