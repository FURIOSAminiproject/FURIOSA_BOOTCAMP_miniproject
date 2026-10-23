import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, OAuthProvider } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setSessionCookie(res, result.token);
    return { success: true, user: result.user };
  }

  @Get('google')
  startGoogle(@Res() res: Response) { return this.startOAuth('google', res); }
  @Get('kakao')
  startKakao(@Res() res: Response) { return this.startOAuth('kakao', res); }
  @Get('naver')
  startNaver(@Res() res: Response) { return this.startOAuth('naver', res); }

  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    return this.finishOAuth('google', req, res, code, state);
  }
  @Get('kakao/callback')
  kakaoCallback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    return this.finishOAuth('kakao', req, res, code, state);
  }
  @Get('naver/callback')
  naverCallback(@Req() req: Request, @Res() res: Response, @Query('code') code?: string, @Query('state') state?: string) {
    return this.finishOAuth('naver', req, res, code, state);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const token = req.cookies?.trip_session;
    if (!token) return { authenticated: false, user: null };
    const user = await this.authService.getUserFromToken(token);
    return { authenticated: Boolean(user), user: user ?? null };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('trip_session', { path: '/' });
    return { success: true };
  }

  private async startOAuth(provider: OAuthProvider, res: Response) {
    const { url, state } = this.authService.getAuthorizationUrl(provider);
    res.cookie(`oauth_state_${provider}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: `/auth/${provider}/callback`,
    });
    return res.redirect(url);
  }

  private async finishOAuth(
    provider: OAuthProvider,
    req: Request,
    res: Response,
    code?: string,
    state?: string,
  ) {
    const expectedState = req.cookies?.[`oauth_state_${provider}`];
    res.clearCookie(`oauth_state_${provider}`, { path: `/auth/${provider}/callback` });
    const frontend = (process.env.FRONTEND_URL || 'http://localhost').replace(/\/$/, '');
    try {
      if (!code || !state || !expectedState || state !== expectedState) {
        throw new BadRequestException('OAuth state 검증에 실패했습니다. 다시 로그인해주세요.');
      }
      const result = await this.authService.authenticateOAuth(provider, code, state);
      this.setSessionCookie(res, result.token);
      return res.redirect(`${frontend}/?oauth=success`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '소셜 로그인에 실패했습니다.';
      return res.redirect(`${frontend}/?oauth=error&message=${encodeURIComponent(message)}`);
    }
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie('trip_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
