import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('应用')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '获取问候语' })
  @ApiResponse({ status: 200, description: '返回问候语', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}
