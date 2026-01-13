import type { Provider } from "@nestjs/common";
import { Global, Module } from "@nestjs/common";

import { ApiConfigService } from "./services/api-config.service";
import { PdfConfigService } from "./services/pdf-config.service";

const providers: Provider[] = [ApiConfigService, PdfConfigService];

@Global()
@Module({
  providers,
  imports: [],
  exports: [...providers],
})
export class SharedModule {}
