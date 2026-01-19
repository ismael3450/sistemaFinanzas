import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { WompiService } from './wompi.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, WompiService],
  exports: [SubscriptionsService, WompiService],
})
export class SubscriptionsModule {}
