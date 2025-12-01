import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional } from 'class-validator';

export class CrawlDto {
  @ApiProperty({
    description: '要爬取的 URL',
    example: 'https://example.com',
  })
  @IsUrl({}, { message: '必须是有效的 URL' })
  url: string;

  @ApiProperty({
    description: 'CSS 选择器，用于提取特定元素',
    example: 'h1, p',
    required: false,
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiProperty({
    description: '是否提取所有链接',
    example: false,
    required: false,
  })
  @IsOptional()
  extractLinks?: boolean;

  @ApiProperty({
    description: '是否提取所有图片',
    example: false,
    required: false,
  })
  @IsOptional()
  extractImages?: boolean;
}

export class CrawlResponseDto {
  @ApiProperty({ description: '页面标题' })
  title: string;

  @ApiProperty({ description: '页面内容' })
  content: string;

  @ApiProperty({ description: '提取的文本内容', required: false })
  extractedText?: string;

  @ApiProperty({ description: '提取的链接', type: [String], required: false })
  links?: string[];

  @ApiProperty({ description: '提取的图片', type: [String], required: false })
  images?: string[];

  @ApiProperty({ description: '原始 HTML', required: false })
  html?: string;
}

