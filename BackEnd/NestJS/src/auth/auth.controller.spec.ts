import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let authController: AuthController;
  let storedUsers: User[] = [];

  const mockUserRepository = {
    findOne: jest.fn<(options: { where: { email: string } }) => Promise<User | null>>().mockImplementation(({ where: { email } }) => {
      const user = storedUsers.find((u) => u.email === email);
      return Promise.resolve(user || null);
    }),
    create: jest.fn<(dto: Partial<User>) => User>().mockImplementation((dto) => {
      return {
        id: `usr_${Date.now()}`,
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
    }),
    save: jest.fn<(user: User) => Promise<User>>().mockImplementation((user) => {
      storedUsers.push(user);
      return Promise.resolve(user);
    }),
    find: jest.fn<() => Promise<User[]>>().mockImplementation(() => Promise.resolve(storedUsers)),
  };

  beforeEach(async () => {
    storedUsers = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: JwtService, useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  it('should register a new user successfully with hashed password', async () => {
    const registerDto = {
      name: '홍길동',
      email: 'traveler@example.com',
      password: 'password123',
    };

    const result = await authController.register(registerDto);

    expect(result.success).toBe(true);
    expect(result.data.email).toBe('traveler@example.com');
    expect(result.data.name).toBe('홍길동');
    expect(result.data.id).toBeDefined();

    // Verify stored user has hashed password, NOT plain text
    expect(storedUsers.length).toBe(1);
    expect(storedUsers[0].passwordHash).not.toBe('password123');
    expect(storedUsers[0].passwordHash?.startsWith('$2')).toBe(true); // bcrypt signature
  });

  it('should throw error when registering with duplicate email', async () => {
    const registerDto = {
      name: '중복사용자',
      email: 'duplicate@example.com',
      password: 'password123',
    };

    await authController.register(registerDto);

    await expect(authController.register(registerDto)).rejects.toThrow(
      '이미 가입된 이메일 주소입니다.',
    );
  });
});
