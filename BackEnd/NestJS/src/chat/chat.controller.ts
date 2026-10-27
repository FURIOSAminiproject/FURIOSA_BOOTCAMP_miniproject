import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ChatRequestDto,
  ChatResponseDto,
  ChatService,
  PlannerChatRequestDto,
  PlannerChatResponseDto,
} from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

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
}

