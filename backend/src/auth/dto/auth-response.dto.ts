import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ example: 'juan@correo.com' })
    email: string;

    @ApiProperty({ example: 'Juan' })
    firstName: string;

    @ApiProperty({ example: 'Pérez' })
    lastName: string;

    @ApiProperty({ example: '+503 7000-0000', required: false })
    phone?: string;

    @ApiProperty({ example: true })
    isActive: boolean;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00Z' })
    updatedAt: Date;

    @ApiProperty({ required: false, example: 'https://example.com/avatar.png' })
    avatarUrl?: string;

    @ApiProperty({ example: false })
    emailVerified: boolean;

    @ApiProperty({ required: false, example: 'c3b0b8d1-2e2a-4f18-9a3d-9f6e0b7a9c12' })
    activeOrgId?: string;
}

export class TokensDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Access token JWT'
    })
    accessToken: string;

    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Refresh token JWT'
    })
    refreshToken: string;

    @ApiProperty({ example: 86400, description: 'Tiempo de expiración en segundos' })
    expiresIn: number;
}

export class AuthResponseDto {
    @ApiProperty({ type: UserResponseDto })
    user: UserResponseDto;

    @ApiProperty({ type: TokensDto })
    tokens: TokensDto;
}

export class RefreshTokenResponseDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Nuevo access token JWT'
    })
    accessToken: string;

    @ApiProperty({ example: 86400, description: 'Tiempo de expiración en segundos' })
    expiresIn: number;
}

export class MessageResponseDto {
    @ApiProperty({ example: 'Operación exitosa' })
    message: string;
}