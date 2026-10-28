import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatService,
  PlannerChatRequestDto,
  PlannerChatResponseDto,
} from './chat.service';
import {
  ItineraryRevisionService,
  type ItineraryRevisionRequest,
  type ItineraryRevisionResponse,
} from './itinerary-revision.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly revisions: ItineraryRevisionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.chat(body);
  }

  @Post('planner')
  @HttpCode(HttpStatus.OK)
  async planChat(
    @Body() body: PlannerChatRequestDto,
  ): Promise<PlannerChatResponseDto> {
    return this.chatService.planChat(body);
  }

  @Post('revise')
  @HttpCode(HttpStatus.OK)
  async revise(
    @Body() body: ItineraryRevisionRequest,
  ): Promise<ItineraryRevisionResponse> {
    return this.revisions.revise(body);
  }
}
