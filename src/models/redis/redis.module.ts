import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [],
  exports: [RedisService],
  providers: [RedisService],
})
export class RedisModule {}
