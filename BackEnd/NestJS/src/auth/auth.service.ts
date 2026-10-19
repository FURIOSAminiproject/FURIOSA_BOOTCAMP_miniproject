import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

export type OAuthProvider = 'google' | 'kakao' | 'naver';
type OAuthProfile = { subject: string; email: string | null; name: string };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const name = (dto.name || dto.nickname || '').trim();
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;
    if (!name) throw new BadRequestException('이름 또는 닉네임을 입력해주세요.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('유효한 이메일 주소를 입력해주세요.');
    }
    if (!password || password.length < 6) throw new BadRequestException('비밀번호는 최소 6자리 이상이어야 합니다.');

    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) throw new ConflictException('이미 가입된 이메일 주소입니다.');
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const user = await this.userRepository.save(this.userRepository.create({
        name, email, passwordHash, authProvider: 'local', providerSubject: null,
      }));
      return {
        success: true,
        message: `${user.name}님, 회원가입이 성공적으로 완료되었습니다!`,
        data: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
      };
    } catch (error: any) {
      if (error?.code === '23505') throw new ConflictException('이미 가입된 이메일 주소입니다.');
      this.logger.error('회원가입 저장 중 오류가 발생했습니다.');
      throw new InternalServerErrorException('회원가입 처리 중 오류가 발생했습니다.');
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) throw new BadRequestException('이메일과 비밀번호를 입력해주세요.');
    const user = await this.userRepository.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email })
      .getOne();
    if (!user?.passwordHash || user.authProvider !== 'local' || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    return { token: await this.issueToken(user), user: this.publicUser(user) };
  }

  getAuthorizationUrl(provider: OAuthProvider): { url: string; state: string } {
    const state = this.randomState();
    const clientId = this.requiredEnv(`${provider.toUpperCase()}_CLIENT_ID`);
    const callback = this.requiredEnv(`${provider.toUpperCase()}_CALLBACK_URL`);
    const url = new URL(provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : provider === 'kakao'
        ? 'https://kauth.kakao.com/oauth/authorize'
        : 'https://nid.naver.com/oauth2.0/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callback);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    if (provider === 'google') url.searchParams.set('scope', 'openid email profile');
    if (provider === 'kakao') url.searchParams.set('scope', 'profile_nickname account_email');
    if (provider === 'naver') url.searchParams.set('state', state);
    return { url: url.toString(), state };
  }

  async authenticateOAuth(provider: OAuthProvider, code: string, state: string) {
    const profile = await this.fetchOAuthProfile(provider, code, state);
    let user = await this.userRepository.findOne({
      where: { authProvider: provider, providerSubject: profile.subject },
    });

    if (!user) {
      if (profile.email) {
        const emailOwner = await this.userRepository.findOne({ where: { email: profile.email } });
        if (emailOwner) {
          throw new ConflictException('이 이메일로 가입된 계정이 있습니다. 기존 로그인 후 계정 연결 기능을 이용해주세요.');
        }
      }
      user = this.userRepository.create({
        name: profile.name.slice(0, 100) || `${provider} 사용자`,
        email: profile.email,
        passwordHash: null,
        authProvider: provider,
        providerSubject: profile.subject,
      });
      try {
        user = await this.userRepository.save(user);
      } catch (error: any) {
        if (error?.code === '23505') throw new ConflictException('이미 등록된 계정 정보입니다. 다시 로그인해주세요.');
        throw new InternalServerErrorException('소셜 계정 저장 중 오류가 발생했습니다.');
      }
    }
    return { token: await this.issueToken(user), user: this.publicUser(user) };
  }

  async getUserFromToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: this.requiredEnv('JWT_SECRET'),
      });
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      return user ? this.publicUser(user) : null;
    } catch {
      return null;
    }
  }

  private async issueToken(user: User) {
    return this.jwtService.signAsync({ sub: user.id, provider: user.authProvider });
  }

  private publicUser(user: User) {
    return { id: user.id, name: user.name, email: user.email, provider: user.authProvider };
  }

  private randomState() {
    return require('node:crypto').randomBytes(32).toString('hex') as string;
  }

  private requiredEnv(name: string) {
    const value = this.config.get<string>(name);
    if (!value) throw new ServiceUnavailableException(`서버 환경변수 ${name}이 설정되지 않았습니다.`);
    return value;
  }

  private async fetchOAuthProfile(provider: OAuthProvider, code: string, state: string): Promise<OAuthProfile> {
    const prefix = provider.toUpperCase();
    const clientId = this.requiredEnv(`${prefix}_CLIENT_ID`);
    const clientSecret = provider === 'kakao'
      ? this.config.get<string>(`${prefix}_CLIENT_SECRET`)
      : this.requiredEnv(`${prefix}_CLIENT_SECRET`);
    const callback = this.requiredEnv(`${prefix}_CALLBACK_URL`);
    const form = new URLSearchParams({
      grant_type: 'authorization_code', client_id: clientId,
      redirect_uri: callback, code,
    });
    if (clientSecret) form.set('client_secret', clientSecret);
    if (provider === 'naver') form.set('state', state);

    const tokenUrl = provider === 'google'
      ? 'https://oauth2.googleapis.com/token'
      : provider === 'kakao'
        ? 'https://kauth.kakao.com/oauth/token'
        : 'https://nid.naver.com/oauth2.0/token';

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
    });
    const tokenData: any = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) {
      this.logger.warn(`${provider} OAuth token exchange failed (HTTP ${tokenResponse.status}).`);
      throw new UnauthorizedException(`${provider} 인증 토큰을 발급받지 못했습니다. 개발자 콘솔의 Client ID, Secret, 콜백 URL을 확인해주세요.`);
    }

    const profileUrl = provider === 'google'
      ? 'https://openidconnect.googleapis.com/v1/userinfo'
      : provider === 'kakao'
        ? 'https://kapi.kakao.com/v2/user/me'
        : 'https://openapi.naver.com/v1/nid/me';
    const profileResponse = await fetch(profileUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const raw: any = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok) throw new UnauthorizedException(`${provider} 사용자 정보를 가져오지 못했습니다.`);

    if (provider === 'google') {
      if (!raw.sub) throw new UnauthorizedException('Google 사용자 식별자를 확인할 수 없습니다.');
      return { subject: String(raw.sub), email: raw.email_verified ? this.normaliseEmail(raw.email) : null, name: raw.name || raw.given_name || 'Google 사용자' };
    }
    if (provider === 'kakao') {
      if (!raw.id) throw new UnauthorizedException('카카오 사용자 식별자를 확인할 수 없습니다.');
      return {
        subject: String(raw.id),
        email: this.normaliseEmail(raw.kakao_account?.is_email_valid && raw.kakao_account?.is_email_verified ? raw.kakao_account?.email : null),
        name: raw.kakao_account?.profile?.nickname || raw.properties?.nickname || '카카오 사용자',
      };
    }
    if (!raw.response?.id) throw new UnauthorizedException('네이버 사용자 식별자를 확인할 수 없습니다.');
    return {
      subject: String(raw.response.id), email: this.normaliseEmail(raw.response.email),
      name: raw.response.name || raw.response.nickname || '네이버 사용자',
    };
  }

  private normaliseEmail(value: unknown): string | null {
    return typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null;
  }
}
