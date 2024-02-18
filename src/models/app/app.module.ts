import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { OAuthServerModule } from '../oauth-server/oauth-server.module';

@Module({
  imports: [OAuthServerModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
