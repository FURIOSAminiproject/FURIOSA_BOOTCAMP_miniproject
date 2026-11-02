import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';
import { ItineraryRevisionService } from './itinerary-revision.service';
import {
  RevisionRequestLimiter,
  RevisionRateLimitInterceptor,
} from './revision-request-limits';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ItineraryRevisionService,
    {
      provide: RevisionRequestLimiter,
      useFactory: () => new RevisionRequestLimiter(),
    },
    RevisionRateLimitInterceptor,
  ],
  exports: [ChatService],
})
export class ChatModule {}
