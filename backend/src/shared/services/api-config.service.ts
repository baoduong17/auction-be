import { Injectable } from "@nestjs/common";
import { isNil } from "@nestjs/common/utils/shared.utils";
import { ConfigService } from "@nestjs/config";

export interface IBlobConfig {
  connectionString: string;
}

@Injectable()
export class ApiConfigService {
  constructor(private configService: ConfigService) { }

  get apiDomain(): string {
    return this.getString("API_DOMAIN");
  }

  get dbConfig() {
    const prod = this.isProduction;

    return {
      host: this.getString("DB_HOST"),
      port: this.getNumber("DB_PORT"),
      username: this.getString("DB_USERNAME"),
      password: this.getString("DB_PASSWORD"),
      database: this.getString("DB_DATABASE"),
      logging: this.getBoolean("ENABLE_ORM_LOGS"),
      ssl: prod ? { rejectUnauthorized: false } : false,
    };
  }

  get stmpConfig() {
    return {
      host: this.getString("MAIL_HOST"),
      port: this.getNumber("MAIL_PORT"),
      user: this.getString("MAIL_USER"),
      pass: this.getString("MAIL_PASS"),
      from: this.getString("MAIL_FROM"),
    };
  }

  get keycloakConfig() {
    return {
      clientId: this.getString("KEYCLOAK_CLIENT_ID"),
      clientSecret: this.getString("KEYCLOAK_CLIENT_SECRET"),
      baseUrl: this.getString("KEYCLOAK_BASE_URL"),
      realmName: this.getString("KEYCLOAK_REALM_NAME"),
    };
  }

  get s3Config() {
    return {
      supabaseUrl: this.getString("SUPABASE_URL"),
      supabaseServiceRoleKey: this.getString("SUPABASE_SERVICE_ROLE_KEY"),
    };
  }

  get googleConfig() {
    return {
      clientIds: this.getStringArray("GOOGLE_CLIENT_IDS"),
    };
  }

  get imageService() {
    return {
      storeDirectory: this.getString("IMAGE_DIRECTORY"),
      imageLimitSize: this.getNumber("IMAGE_LIMIT_SIZE"),
    };
  }

  get appleConfig() {
    return {
      clientIds: this.getStringArray("APPLE_CLIENT_IDS"),
    };
  }

  get keycloakJwtConfig() {
    const { baseUrl, realmName } = { ...this.keycloakConfig };

    return {
      issuer: `${baseUrl}/realms/${realmName}`,
      jwksUri: `${baseUrl}/realms/${realmName}/protocol/openid-connect/certs`,
      tokenUri: `${baseUrl}/realms/${realmName}/protocol/openid-connect/token`,
    };
  }

  get serverPort(): number {
    return this.getNumber("PORT");
  }

  get logLevel(): string {
    return this.getString("LOG_LEVEL");
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "dev" || this.nodeEnv === "development";
  }

  get isProduction(): boolean {
    return this.nodeEnv === "prod" || this.nodeEnv === "production";
  }

  get enableSwagger(): boolean {
    return this.getBoolean("ENABLE_DOCUMENTATION");
  }

  get nodeEnv(): string {
    return this.getString("NODE_ENV");
  }

  get rabbitMqUrl(): string {
    return this.getString("RABBITMQ_URL");
  }

  private getStringArray(key: string): string[] {
    const value = this.get(key);
    if (!value) {
      return [];
    }
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  private getNumber(key: string): number {
    const value = this.getString(key);

    try {
      return Number(value);
    } catch {
      throw new Error(key + " environment variable is not a number");
    }
  }

  private getBoolean(key: string): boolean {
    const value = this.getString(key);

    try {
      return Boolean(JSON.parse(value));
    } catch {
      throw new Error(key + " env var is not a boolean");
    }
  }

  private getString(key: string): string {
    const value = this.get(key);

    return value.replaceAll("\\n", "\n");
  }

  private get(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value || isNil(value)) {
      throw new Error(key + " environment variable does not set");
    }

    return value;
  }
}
