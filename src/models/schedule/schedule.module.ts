import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import * as xEnv from '@my-environment';

import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import * as entities from './entity';

@Module({
  imports: [],
})
export class ScheduleModule {
  static register() {
    return {
      module: ScheduleModule,
      ...(xEnv.TYPEORM_CONFIG.host && {
        imports: [
          TypeOrmModule.forRootAsync({
            useFactory: async () => ({
              ...xEnv.TYPEORM_CONFIG,

              autoLoadEntities: true,
              entities: getMetadataArgsStorage().tables.map((t) => t.target),
            }),
          }),
          TypeOrmModule.forFeature([...Object.values(entities)]),
        ],
        controllers: [ScheduleController],
        providers: [ScheduleService],
      }),
    };
  }
}
