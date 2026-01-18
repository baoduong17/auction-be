import { BadRequestException, Injectable, OnModuleInit } from "@nestjs/common";
import { ApiConfigService } from "../../shared/services/api-config.service";
import { KeycloakUser } from "./domain/keycloak-user";

import { KeycloakAdminClient } from "@s3pweb/keycloak-admin-client-cjs";
import { LoginForm } from "../auth/domain/login-form";
import axios, { AxiosError } from "axios";
import { Token } from "../auth/domain/token";
import { Uuid } from "common/types";

@Injectable()
export class KeycloakService implements OnModuleInit {
  private readonly kcAdminClient: KeycloakAdminClient;

  constructor(private readonly configService: ApiConfigService) {
    this.kcAdminClient = new KeycloakAdminClient(
      this.configService.keycloakConfig,
    );
  }

  async onModuleInit() {
    await this.kcAdminClient.auth({
      grantType: "client_credentials",
      ...this.configService.keycloakConfig,
    });
  }

  async createUser(user: KeycloakUser) {
    return this.kcAdminClient.users.create({
      email: user.email,
      username: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: true,
      credentials:
        user.password == null
          ? undefined
          : [
            {
              type: "password",
              value: user.password,
              temporary: false,
            },
          ],
    });
  }

  async changePassword(keycloakId: Uuid, newPassword: string) {
    await this.kcAdminClient.users.resetPassword({
      id: keycloakId,
      credential: {
        type: "password",
        value: newPassword,
        temporary: false,
      },
    });
  }

  async login(login: LoginForm): Promise<Token> {
    return await this.requestToken({
      grant_type: "password",
      username: login.email,
      password: login.password,
    });
  }

  async googleLogin(token: String): Promise<Token> {
    return await this.requestToken({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: token,
      subject_issuer: "google",
    });
  }

  async impersonate(userId: String): Promise<Token> {
    return await this.requestToken({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      requested_subject: userId,
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<Token> {
    return await this.requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  private async requestToken(body: any): Promise<Token> {
    const response = await this.performTokenRequest(body);

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
      tokenType: response.data.token_type,
      refreshExpiresIn: response.data.refresh_expires_in,
      scope: response.data.scope,
      sessionState: response.data.session_state,
    };
  }

  private async performTokenRequest(body: any) {
    const tokenUri = this.configService.keycloakJwtConfig.tokenUri;
    try {
      return await axios.post(
        tokenUri,
        {
          client_id: this.configService.keycloakConfig.clientId,
          client_secret: this.configService.keycloakConfig.clientSecret,
          ...body,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.status == 400 || e.status == 401) {
          throw new BadRequestException(e.response?.data.error_description);
        }
      }
      throw e;
    }
  }
}
