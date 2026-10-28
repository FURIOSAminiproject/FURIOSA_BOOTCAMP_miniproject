import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';
import { ItineraryRevisionService } from './itinerary-revision.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ItineraryRevisionService],
  exports: [ChatService],
})
export class ChatModule {}
