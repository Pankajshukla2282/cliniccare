import {
  BadRequestException,
  Inject,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../generated/prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../api/prisma/prisma.service';
import { RegisterDto, TenantSignupDto, LoginDto } from './dto';
import { apiConfig } from '../config';

const REFRESH_TTL_MS = apiConfig.refreshTtlDays * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = apiConfig.bcryptSaltRounds;
const TENANT_TRIAL_DAYS = 14;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'tenant'
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function patientNumber(): string {
  return `P-${randomBytes(4).toString('hex').toUpperCase()}`;
}

const logger = new Logger('AuthService');

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  // ... rest of service