import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { RegisterFormDto } from "./dto/register-form.dto";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginFormDto } from "./dto/login-form.dto";
import { AuthUser } from "../../decorator/auth-user.decorator";
import { UserEntity } from "../user/entities/user.entity";
import { CurrentUserDto } from "./dto/current-user.dto";
import { RequireLoggedIn } from "../../guards/role-container";
import { AuthResultDto } from "./dto/auth-result.dto";
import { RefreshTokenFormDto } from "./dto/refresh-token-form.dto";
import { GoogleTokenFormDto } from "./dto/google-token-form.dto";
import { AppleTokenFormDto } from "./dto/apple-token-form.dto";
import { AppleAuthService } from "./apple-auth.service";
import { UserChangePasswordFormDto } from "./dto/user-change-password-form.dto";
@ApiTags("Auths")
@Controller("auths")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appleAuthService: AppleAuthService,
  ) { }

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  async register(@Body() registerDto: RegisterFormDto): Promise<AuthResultDto> {
    return AuthResultDto.fromAuthResult(
      await this.authService.register(
        RegisterFormDto.toRegisterForm(registerDto),
      ),
    );
  }

  @Post("login")
  async login(@Body() loginDto: LoginFormDto): Promise<AuthResultDto> {
    return AuthResultDto.fromAuthResult(
      await this.authService.login(LoginFormDto.toLoginForm(loginDto)),
    );
  }

  @Put("change-password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change user's password" })
  @ApiResponse({ status: 200, description: "Password changed successfully" })
  @RequireLoggedIn()
  async changePassword(
    @AuthUser() user: UserEntity,
    @Body() userChangePasswordFormDto: UserChangePasswordFormDto,
  ): Promise<void> {
    return await this.authService.changePassword(
      user,
      userChangePasswordFormDto,
    );
  }

  @Post("google")
  async googleLogin(
    @Body() googleTokenFormDto: GoogleTokenFormDto,
  ): Promise<AuthResultDto> {
    return AuthResultDto.fromAuthResult(
      await this.authService.googleLogin(
        GoogleTokenFormDto.toGoogleTokenForm(googleTokenFormDto),
      ),
    );
  }

  @Post("apple")
  async appleLogin(
    @Body() appleTokenFormDto: AppleTokenFormDto,
  ): Promise<AuthResultDto> {
    return AuthResultDto.fromAuthResult(
      await this.appleAuthService.appleLogin(
        AppleTokenFormDto.toAppleTokenForm(appleTokenFormDto),
      ),
    );
  }

  @Post("refresh-token")
  async refreshToken(
    @Body() refreshTokenFormDto: RefreshTokenFormDto,
  ): Promise<AuthResultDto> {
    return AuthResultDto.fromAuthResult(
      await this.authService.refreshToken(
        RefreshTokenFormDto.toRefreshTokenForm(refreshTokenFormDto),
      ),
    );
  }

  @Get("me")
  @RequireLoggedIn()
  @ApiBearerAuth()
  getMe(@AuthUser() user: UserEntity): CurrentUserDto {
    return CurrentUserDto.fromUser(user);
  }
}
