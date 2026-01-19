import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class MemberUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  avatarUrl?: string;
}

export class MemberResponseDto {
  @ApiProperty({ description: 'Membership ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Member role', enum: Role })
  role: Role;

  @ApiProperty({ description: 'Is membership active' })
  isActive: boolean;

  @ApiProperty({ description: 'Invitation date' })
  invitedAt: Date;

  @ApiPropertyOptional({ description: 'Join date' })
  joinedAt?: Date;

  @ApiProperty({ type: MemberUserDto })
  user: MemberUserDto;
}
