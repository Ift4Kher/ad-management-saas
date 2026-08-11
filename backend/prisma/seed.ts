/**
 * AdSync Database Seed Script
 *
 * Seeds the database with two distinct test workspaces (Workspace Alpha & Workspace Beta)
 * to support multi-tenant workspace isolation testing.
 *
 * SECURITY COMPLIANCE:
 * - Passwords hashed with bcrypt.
 * - All OAuth tokens are encrypted using AES-256-GCM before writing to DB.
 * - No plain text tokens or secrets in seed data.
 * - No campaigns created yet (as specified in Phase 2 brief).
 */

import 'dotenv/config';
import { PrismaClient, Platform, ConnectionStatus, WorkspaceRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { encryptToken } from '../src/lib/encryption.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Set encryption key for seed process if not present
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    process.env.TOKEN_ENCRYPTION_KEY = '0000000000000000000000000000000000000000000000000000000000000000';
  }

  // Clean existing seed data
  console.log('Cleaning existing seed data...');
  await prisma.adAccountConnection.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Create User Alpha & Workspace Alpha
  const passwordHashAlpha = await bcrypt.hash('Password123!', 10);
  const userAlpha = await prisma.user.create({
    data: {
      name: 'Alpha Owner',
      email: 'user_alpha@adsync.test',
      passwordHash: passwordHashAlpha,
      emailVerifiedAt: new Date(),
    },
  });

  const workspaceAlpha = await prisma.workspace.create({
    data: {
      name: 'Workspace Alpha (Agency)',
      ownerId: userAlpha.id,
      locale: 'en',
    },
  });

  await prisma.workspaceMember.create({
    data: {
      userId: userAlpha.id,
      workspaceId: workspaceAlpha.id,
      role: WorkspaceRole.OWNER,
    },
  });

  // Create encrypted OAuth tokens for Workspace Alpha
  const rawGoogleAccessToken = 'ya29.a0ARdaC0_ALPHA_GOOGLE_OAUTH_ACCESS_TOKEN_REAL_FORMAT_XYZ';
  const rawGoogleRefreshToken = '1//04_ALPHA_GOOGLE_OAUTH_REFRESH_TOKEN_XYZ';

  await prisma.adAccountConnection.create({
    data: {
      workspaceId: workspaceAlpha.id,
      platform: Platform.GOOGLE,
      accessTokenEncrypted: encryptToken(rawGoogleAccessToken),
      refreshTokenEncrypted: encryptToken(rawGoogleRefreshToken),
      status: ConnectionStatus.CONNECTED,
      connectedAt: new Date(),
    },
  });

  // Create User Beta & Workspace Beta
  const passwordHashBeta = await bcrypt.hash('Password123!', 10);
  const userBeta = await prisma.user.create({
    data: {
      name: 'Beta Owner',
      email: 'user_beta@adsync.test',
      passwordHash: passwordHashBeta,
      emailVerifiedAt: new Date(),
    },
  });

  const workspaceBeta = await prisma.workspace.create({
    data: {
      name: 'Workspace Beta (E-Commerce)',
      ownerId: userBeta.id,
      locale: 'bn',
    },
  });

  await prisma.workspaceMember.create({
    data: {
      userId: userBeta.id,
      workspaceId: workspaceBeta.id,
      role: WorkspaceRole.OWNER,
    },
  });

  // Create encrypted OAuth tokens for Workspace Beta
  const rawMetaAccessToken = 'EAAG_BETA_META_OAUTH_ACCESS_TOKEN_REAL_FORMAT_ABC';
  await prisma.adAccountConnection.create({
    data: {
      workspaceId: workspaceBeta.id,
      platform: Platform.META,
      accessTokenEncrypted: encryptToken(rawMetaAccessToken),
      status: ConnectionStatus.CONNECTED,
      connectedAt: new Date(),
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(` - Workspace Alpha ID: ${workspaceAlpha.id} (Owner: ${userAlpha.email})`);
  console.log(` - Workspace Beta ID:  ${workspaceBeta.id} (Owner: ${userBeta.email})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
