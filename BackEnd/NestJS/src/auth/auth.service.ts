import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(registerDto: RegisterDto) {
    const rawName = registerDto.name || registerDto.nickname;
    const name = rawName?.trim();
    const email = registerDto.email?.trim().toLowerCase();
    const password = registerDto.password;

    this.logger.log(`[회원가입 요청 수신] email: ${email}, name: ${name}`);

    // 1. 유효성 검사
    if (!name) {
      throw new BadRequestException('이름 또는 닉네임을 입력해주세요.');
    }
    if (!email || !email.includes('@')) {
      throw new BadRequestException('유효한 이메일 주소를 입력해주세요.');
    }
    if (!password || password.length < 6) {
      throw new BadRequestException('비밀번호는 최소 6자리 이상이어야 합니다.');
    }

    // 2. 데이터베이스 중복 이메일 체크
    try {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        this.logger.warn(`[회원가입 실패] 이미 등록된 이메일: ${email}`);
        throw new ConflictException('이미 가입된 이메일 주소입니다.');
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.error(`[DB 조회 오류] ${err}`);
      throw new InternalServerErrorException('데이터베이스 조회 중 오류가 발생했습니다.');
    }

    // 3. 비밀번호 해시 처리 (bcryptjs salt 10회 적용)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    this.logger.log(`[비밀번호 해시 완료] ${passwordHash.substring(0, 20)}...`);

    // 4. PostgreSQL 데이터베이스에 사용자 정보 저장
    try {
      const newUser = this.userRepository.create({
        name,
        email,
        passwordHash, // 해시 처리된 비밀번호 저장
      });

      const savedUser = await this.userRepository.save(newUser);

      this.logger.log(
        `[PostgreSQL DB 저장 완료] ID: ${savedUser.id}, Email: ${savedUser.email}, Name: ${savedUser.name}`,
      );

      return {
        success: true,
        message: `${savedUser.name}님, 회원가입이 성공적으로 완료되었습니다!`,
        data: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          createdAt: savedUser.createdAt,
        },
      };
    } catch (err: any) {
      this.logger.error(`[PostgreSQL DB 저장 실패] ${err.message}`, err.stack);
      if (err.code === '23505') {
        // PostgreSQL unique violation code
        throw new ConflictException('이미 가입된 이메일 주소입니다.');
      }
      throw new InternalServerErrorException(
        '데이터베이스에 사용자 정보를 저장하지 못했습니다. PostgreSQL 연결을 확인해주세요.',
      );
    }
  }

  async getAllUsers() {
    return this.userRepository.find({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
    });
  }
}
