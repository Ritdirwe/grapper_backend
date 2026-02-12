import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { ReportingModule } from './reporting/reporting.module';

@Module({
  imports: [AdminModule, ReportingModule],
  exports: [AdminModule, ReportingModule],
})
export class OpsModule {}
