import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, OrgId, Permissions, RequestUser } from '../common/decorators';
import { AssignRoleDto, CreateUserDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Permissions('user.read')
  @Get()
  list(
    @CurrentUser() _user: RequestUser,
    @OrgId() orgId: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.users.list(orgId, Number(skip ?? 0), Number(take ?? 20));
  }

  @Permissions('user.manage')
  @Post()
  create(@OrgId() orgId: number, @Body() dto: CreateUserDto) {
    return this.users.create(orgId, dto);
  }

  @Permissions('user.read')
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number) {
    return this.users.get(id, orgId);
  }

  @Permissions('user.manage')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: UpdateUserDto) {
    return this.users.update(id, orgId, dto);
  }

  @Permissions('user.manage')
  @Post(':id/roles')
  assignRole(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: number, @Body() dto: AssignRoleDto) {
    return this.users.assignRole(id, orgId, dto);
  }
}
