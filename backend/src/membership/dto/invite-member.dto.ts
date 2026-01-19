import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({
    description: 'Email of the user to invite',
    example: 'newmember@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Role to assign to the member',
    enum: Role,
    default: Role.MEMBER,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.MEMBER;
}
