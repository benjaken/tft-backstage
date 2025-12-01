import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { CrawlDto, CrawlResponseDto } from './dto/crawl.dto';

@Injectable()
export class CrawlerService {
  async crawl(dto: CrawlDto): Promise<CrawlResponseDto> {
    try {
      // 发送 HTTP 请求获取页面内容
      const response = await axios.get(dto.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000, // 10秒超时
      });

      const html = response.data as string;
      const $ = cheerio.load(html);

      // 提取标题
      const title = $('title').text() || '无标题';

      // 提取内容
      let content = '';
      let extractedText = '';

      if (dto.selector) {
        // 如果指定了选择器，提取匹配的元素
        const elements = $(dto.selector);
        extractedText = elements
          .map((_, el) => $(el).text().trim())
          .get()
          .join('\n');
        content = extractedText;
      } else {
        // 默认提取 body 文本
        content = $('body').text().replace(/\s+/g, ' ').trim();
      }

      const result: CrawlResponseDto = {
        title,
        content: content || '无内容',
        html: html,
      };

      // 提取链接
      if (dto.extractLinks) {
        const links: string[] = [];
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (href) {
            // 处理相对链接
            try {
              const absoluteUrl = new URL(href, dto.url).href;
              links.push(absoluteUrl);
            } catch {
              links.push(href);
            }
          }
        });
        result.links = [...new Set(links)]; // 去重
      }

      // 提取图片
      if (dto.extractImages) {
        const images: string[] = [];
        $('img[src]').each((_, el) => {
          const src = $(el).attr('src');
          if (src) {
            // 处理相对链接
            try {
              const absoluteUrl = new URL(src, dto.url).href;
              images.push(absoluteUrl);
            } catch {
              images.push(src);
            }
          }
        });
        result.images = [...new Set(images)]; // 去重
      }

      if (extractedText) {
        result.extractedText = extractedText;
      }

      return result;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new HttpException(
            `请求失败: ${error.response.status} ${error.response.statusText}`,
            HttpStatus.BAD_REQUEST,
          );
        } else if (error.request) {
          throw new HttpException(
            '无法连接到目标服务器',
            HttpStatus.REQUEST_TIMEOUT,
          );
        }
      }
      const message = error instanceof Error ? error.message : '未知错误';
      throw new HttpException(
        `爬取失败: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

