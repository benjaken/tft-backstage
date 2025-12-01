import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimeDto {
  @ApiProperty({
    description: '最后爬取时间（北京时间，格式：YYYY-MM-DD HH:mm:ss）',
    example: '2024-12-01 20:30:00',
    nullable: true,
  })
  lastCrawlTime: string | null;

  @ApiProperty({
    description: '数据库中团队组合的总数量',
    example: 47,
  })
  totalCount: number;
}

