import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgId, Permissions } from '../common/decorators';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Permissions('search.use')
  @Get()
  search(
    @OrgId() orgId: number,
    @Query('q') q: string,
    @Query('scope') scope?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.searchService.search(
      orgId,
      q ?? '',
      scope ?? 'all',
      Number(skip ?? 0),
      Number(take ?? 10),
    );
  }
}
