import { Controller, Post, Body, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CrawlerService } from './crawler.service';
import { CrawlDto, CrawlResponseDto } from './dto/crawl.dto';
import { TFTacticsService } from './tftactics.service';
import { TFTacticsResponseDto, TFTUnitsResponseDto } from './dto/tftactics.dto';
import { UpdateTimeDto } from './dto/update-time.dto';
import { DatabaseService } from '../database/database.service';

@ApiTags('爬虫')
@Controller('crawler')
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly tftacticsService: TFTacticsService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('crawl')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '爬取网页内容' })
  @ApiBody({ type: CrawlDto })
  @ApiResponse({
    status: 200,
    description: '爬取成功',
    type: CrawlResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 408, description: '请求超时' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async crawl(@Body() crawlDto: CrawlDto): Promise<CrawlResponseDto> {
    return this.crawlerService.crawl(crawlDto);
  }

  @Get('tftactics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '抓取 TFTactics 团队组合数据' })
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'TFTactics URL，默认为团队组合页面',
    example: 'https://tftactics.gg/tierlist/team-comps/',
  })
  @ApiResponse({
    status: 200,
    description: '抓取成功',
    type: TFTacticsResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 408, description: '请求超时' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async crawlTFTactics(
    @Query('url') url?: string,
  ): Promise<TFTacticsResponseDto> {
    const targetUrl =
      url || 'https://tftactics.gg/tierlist/team-comps/';
    return this.tftacticsService.crawlTeamComps(targetUrl);
  }

  @Get('tftactics/units')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '抓取 DataTFT 英雄数据库数据' })
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'DataTFT 英雄数据库 URL，默认为 https://www.datatft.com/database#unit',
    example: 'https://www.datatft.com/database#unit',
  })
  @ApiQuery({
    name: 'season',
    required: false,
    description: '赛季标识，例如 S15、S16',
    example: 'S15',
  })
  @ApiResponse({
    status: 200,
    description: '抓取成功',
    type: TFTUnitsResponseDto,
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 408, description: '请求超时' })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async crawlUnits(
    @Query('url') url?: string,
    @Query('season') season = 'S15',
  ): Promise<TFTUnitsResponseDto> {
    const targetUrl =
      url || 'https://www.datatft.com/database#unit';
    return this.tftacticsService.crawlUnits(targetUrl, season);
  }

  @Get('tftactics/units/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取指定赛季的英雄数据（从 Redis / 数据库）' })
  @ApiQuery({
    name: 'season',
    required: false,
    description: '赛季标识，例如 S15、S16',
    example: 'S15',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: TFTUnitsResponseDto,
  })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async getUnitsBySeason(
    @Query('season') season = 'S15',
  ): Promise<TFTUnitsResponseDto> {
    return this.databaseService.getUnitsBySeason(season);
  }

  @Get('tftactics/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取数据库中的团队组合数据列表' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: TFTacticsResponseDto,
  })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async getTeamCompsList(): Promise<TFTacticsResponseDto> {
    return this.databaseService.getAllTeamComps();
  }

  @Get('tftactics/update-time')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取数据最后更新时间' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UpdateTimeDto,
  })
  @ApiResponse({ status: 500, description: '服务器错误' })
  async getUpdateTime(): Promise<UpdateTimeDto> {
    return this.databaseService.getUpdateTime();
  }
}

