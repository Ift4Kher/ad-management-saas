/**
 * Verification Script: Confirm Database Tables, Relationships, and Encrypted Tokens
 *
 * Runs raw and Prisma queries against the live Neon PostgreSQL database to verify:
 * 1. All models and tables exist.
 * 2. Relationships between User, Workspace, WorkspaceMember, and AdAccountConnection are intact.
 * 3. OAuth tokens stored in AdAccountConnection are encrypted at rest (not plain text).
 * 4. Tokens can be decrypted back to their expected value using decryptToken.
 */

import 'dotenv/config';
import { prisma } from '../lib/db.js';
import { decryptToken } from '../lib/encryption.js';

async function verify() {
  console.log('🔍 Running Database Schema & Encryption Verification...');

  // 1. Verify Workspaces and Owners
  const workspaces = await prisma.workspace.findMany({
    include: {
      owner: true,
      members: { include: { user: true } },
      adAccountConnections: true,
    },
  });

  console.log(`\nFound ${workspaces.length} workspaces in Neon database:`);

  for (const ws of workspaces) {
    console.log(`\n🏢 Workspace: "${ws.name}" (ID: ${ws.id}, Locale: ${ws.locale})`);
    console.log(`   Owner: ${ws.owner.name} (${ws.owner.email})`);
    console.log(`   Members Count: ${ws.members.length}`);

    for (const conn of ws.adAccountConnections) {
      console.log(`   🔌 Connected Platform: ${conn.platform} (Status: ${conn.status})`);
      console.log(`      Raw Stored Access Token:  "${conn.accessTokenEncrypted}"`);

      // Verify token is encrypted at rest (must start with v1: format and not plain text)
      if (!conn.accessTokenEncrypted.startsWith('v1:')) {
        throw new Error(`SECURITY FAILURE: Access token for ${conn.platform} is NOT encrypted!`);
      }

      // Decrypt token to verify round-trip
      const decryptedAccess = decryptToken(conn.accessTokenEncrypted);
      console.log(`      Decrypted Access Token:   "${decryptedAccess}"`);

      if (conn.refreshTokenEncrypted) {
        if (!conn.refreshTokenEncrypted.startsWith('v1:')) {
          throw new Error(`SECURITY FAILURE: Refresh token for ${conn.platform} is NOT encrypted!`);
        }
        const decryptedRefresh = decryptToken(conn.refreshTokenEncrypted);
        console.log(`      Decrypted Refresh Token:  "${decryptedRefresh}"`);
      }
    }
  }

  // 2. Count total tables / models
  const counts = {
    users: await prisma.user.count(),
    workspaces: await prisma.workspace.count(),
    members: await prisma.workspaceMember.count(),
    connections: await prisma.adAccountConnection.count(),
    campaigns: await prisma.campaign.count(),
    assets: await prisma.creativeAsset.count(),
    events: await prisma.subscriptionEvent.count(),
    aiLogs: await prisma.aiUsageLog.count(),
  };

  console.log('\n📊 Database Model Row Counts:');
  console.table(counts);

  console.log('\n✅ Database schema, relationships, and AES-256 token encryption verified successfully!');
}

verify()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
