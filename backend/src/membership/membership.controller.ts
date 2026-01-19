import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import {
  InviteMemberDto,
  UpdateMemberRoleDto,
  MemberResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../common/decorators';
import { PaginationDto, PaginatedResponseDto } from '../common/dto';

@ApiTags('Membership')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/members')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Member invited successfully',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already a member' })
  async invite(
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
  ): Promise<MemberResponseDto> {
    return this.membershipService.inviteMember(organizationId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all members of the organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'List of members',
    type: [MemberResponseDto],
  })
  async findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<MemberResponseDto>> {
    return this.membershipService.findAll(organizationId, userId, pagination);
  }

  @Get(':memberId')
  @ApiOperation({ summary: 'Get a specific member' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  @ApiResponse({
    status: 200,
    description: 'Member details',
    type: MemberResponseDto,
  })
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ): Promise<MemberResponseDto> {
    return this.membershipService.findOne(organizationId, memberId, userId);
  }

  @Patch(':memberId/role')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  @ApiResponse({
    status: 200,
    description: 'Member role updated',
    type: MemberResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateRole(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: string,
  ): Promise<MemberResponseDto> {
    return this.membershipService.updateRole(organizationId, memberId, dto, userId);
  }

  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke member access' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Membership ID' })
  @ApiResponse({
    status: 200,
    description: 'Membership revoked',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async revoke(
    @Param('organizationId') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.membershipService.revokeMembership(organizationId, memberId, userId);
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave the organization' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully left organization',
  })
  async leave(
    @Param('organizationId') organizationId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.membershipService.leaveOrganization(organizationId, userId);
  }
}
