import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export enum ReqAuthType {
  User = 'user',
  SocialProfile = 'socialProfile',
  OAuth = 'oAuth',
}

export const ReqAuth = createParamDecorator(
  (type: ReqAuthType, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    switch (type) {
      case ReqAuthType.SocialProfile:
        return request.socialProfile || null;
      case ReqAuthType.OAuth:
        return request.oAuth || null;
      case ReqAuthType.User:
      default:
        return request.oAuth?.user || request.user || null;
    }
  },
);
