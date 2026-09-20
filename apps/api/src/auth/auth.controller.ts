import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, RequestUser } from '../common/decorators';
import { AuthService } from './auth.service';
import { apiConfig } from '../config';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto, TenantSignupDto } from './dto';

// Sensitive public endpoints get tighter limits than the API-wide default:
// brute-force / payload-spam protection without slowing legitimate traffic.
const LOGIN_LIMIT = { default: { limit: apiConfig.authRateLimitMax, ttl: apiConfig.rateLimitTtlMs } };
const REGISTER_LIMIT = { default: { limit: Math.max(apiConfig.authRateLimitMax, 20), ttl: apiConfig.rateLimitTtlMs } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(REGISTER_LIMIT)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle(REGISTER_LIMIT)
  @Post('tenant-signup')
  tenantSignup(@Body() dto: TenantSignupDto) {
    return this.auth.tenantSignup(dto);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.sub);
  }

  @ApiBearerAuth()
  @Get('sessions')
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.listSessions(user.sub);
  }

  @ApiBearerAuth()
  @Delete('sessions/:id')
  revokeSession(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.auth.revokeSession(user.sub, id);
  }

  @ApiBearerAuth()
  @Post('logout-all')
  revokeAll(@CurrentUser() user: RequestUser) {
    return this.auth.revokeAllSessions(user.sub);
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Throttle(LOGIN_LIMIT)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }
}
