import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.trip_session;

    if (!token) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }

    const user = await this.authService.getUserFromToken(token);

    if (!user) {
      throw new UnauthorizedException('세션이 유효하지 않습니다.');
    }

    request.user = user;
    return true;
  }
}