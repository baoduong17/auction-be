import { ApiProperty } from "@nestjs/swagger";
import { GoogleTokenForm } from "../domain/google-token-form";
import { IsNotEmpty } from "class-validator";

export class GoogleTokenFormDto {
  @ApiProperty()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty()
  @IsNotEmpty()
  accessToken: string;

  public static toGoogleTokenForm(dto: GoogleTokenFormDto): GoogleTokenForm {
    return {
      idToken: dto.idToken,
      accessToken: dto.accessToken,
    };
  }
}
