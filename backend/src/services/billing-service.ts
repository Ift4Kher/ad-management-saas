/**
 * Billing & Subscription Management Service
 *
 * Handles workspace plan tiers (Starter, Growth, Agency), usage metering,
 * Stripe recurring card checkout, and bKash / Nagad MFS direct mobile wallet sandbox payments.
 *
 * OPERATIONAL DIFFERENCES BETWEEN PAYMENT PATHS:
 * 1. STRIPE PATH (Card Subscriptions):
 *    - Redirects to hosted Stripe Checkout. Automatically handles recurring card auto-debits.
 *    - Subscription lifecycle events (renewal, payment failure, cancellation) arrive asynchronously via webhooks.
 *
 * 2. BKASH / NAGAD PATH (MFS Mobile Wallet Direct Checkout):
 *    - Direct Bangladeshi Mobile Financial Service (MFS) sandbox integration.
 *    - Operates via explicit 2-step push/pull transaction (Create Payment ID -> Execute with OTP & PIN).
 *    - Non-recurring single-cycle payment requiring user mobile wallet authorization.
 */

import { PlanTier, SubscriptionStatus, PaymentProvider } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';

export interface PlanLimits {
  name: string;
  priceUsd: number;
  priceBdt: number;
  maxAccounts: number;
  maxWorkspaces: number;
  aiCredits: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  STARTER: {
    name: 'Starter',
    priceUsd: 29,
    priceBdt: 3200,
    maxAccounts: 3,
    maxWorkspaces: 1,
    aiCredits: 50,
  },
  GROWTH: {
    name: 'Growth',
    priceUsd: 79,
    priceBdt: 8700,
    maxAccounts: 10,
    maxWorkspaces: 3,
    aiCredits: 250,
  },
  AGENCY: {
    name: 'Agency',
    priceUsd: 199,
    priceBdt: 21900,
    maxAccounts: 9999,
    maxWorkspaces: 9999,
    aiCredits: 1000,
  },
};

/**
 * Get workspace plan details and current usage metering
 */
export async function getWorkspaceUsageAndPlan(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) throw new Error('Workspace not found.');

  // Count connected ad accounts
  const connectedAccountsCount = await prisma.adAccountConnection.count({
    where: { workspaceId },
  });

  // Count workspaces owned by user
  const userWorkspacesCount = await prisma.workspace.count({
    where: { ownerId: workspace.ownerId },
  });

  // Aggregate AI credits (tokensUsed) for the current billing period
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const aiUsageAggregate = await prisma.aiUsageLog.aggregate({
    where: {
      workspaceId,
      createdAt: { gte: firstDayOfMonth },
    },
    _sum: { tokensUsed: true },
  });

  const aiTokensUsed = aiUsageAggregate._sum.tokensUsed || 0;
  // Convert tokens to credits (e.g. 1 credit = ~200 tokens)
  const aiCreditsUsed = Math.ceil(aiTokensUsed / 200);

  const limits = PLAN_LIMITS[workspace.plan];

  return {
    plan: workspace.plan,
    status: workspace.subscriptionStatus,
    limits,
    usage: {
      connectedAccounts: connectedAccountsCount,
      maxAccounts: limits.maxAccounts,
      userWorkspaces: userWorkspacesCount,
      maxWorkspaces: limits.maxWorkspaces,
      aiCreditsUsed,
      maxAiCredits: limits.aiCredits,
    },
    periodEnd: workspace.currentPeriodEnd,
  };
}

/**
 * Create Stripe Checkout Session (Sandbox / Mock Adapter)
 */
export async function createStripeCheckoutSession(workspaceId: string, plan: PlanTier) {
  const checkoutUrl = `http://localhost:3000/dashboard/billing?session=stripe_mock_${Date.now()}&plan=${plan}`;
  
  logger.info({ workspaceId, plan }, 'Created Stripe Checkout Sandbox Session');

  return {
    url: checkoutUrl,
    sessionId: `cs_test_${Date.now()}`,
  };
}

/**
 * Handle Stripe Webhooks for subscription lifecycle events
 */
export async function processStripeWebhookEvent(event: {
  type: string;
  data: {
    object: {
      id: string;
      customer?: string;
      subscription?: string;
      metadata?: { workspaceId?: string; plan?: string };
    };
  };
}) {
  const { type, data } = event;
  const obj = data.object;
  const workspaceId = obj.metadata?.workspaceId;

  logger.info({ type, workspaceId, objId: obj.id }, 'Processing Stripe Webhook Event');

  if (!workspaceId) return;

  let newStatus: SubscriptionStatus = 'ACTIVE';
  let planTier: PlanTier | undefined = obj.metadata?.plan as PlanTier | undefined;

  if (type === 'invoice.payment_succeeded' || type === 'customer.subscription.created') {
    newStatus = 'ACTIVE';
  } else if (type === 'invoice.payment_failed') {
    // VISIBLE IN-APP FAILED PAYMENT STATE: Set status to PAST_DUE
    newStatus = 'PAST_DUE';
  } else if (type === 'customer.subscription.deleted') {
    newStatus = 'CANCELED';
  }

  // Update workspace
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      subscriptionStatus: newStatus,
      ...(planTier ? { plan: planTier } : {}),
      stripeCustomerId: obj.customer || undefined,
      stripeSubscriptionId: obj.subscription || obj.id || undefined,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Record SubscriptionEvent in DB
  return prisma.subscriptionEvent.create({
    data: {
      workspaceId,
      eventType: type,
      provider: PaymentProvider.STRIPE,
      payload: event as any,
    },
  });
}

/**
 * Create bKash or Nagad MFS Checkout Payment (Sandbox Mode)
 */
export async function createMfsCheckout(
  workspaceId: string,
  provider: 'BKASH' | 'NAGAD',
  plan: PlanTier,
) {
  const paymentID = `MFS_PAY_${provider}_${Date.now()}`;
  const amountBdt = PLAN_LIMITS[plan].priceBdt;

  logger.info(
    { workspaceId, provider, plan, amountBdt, paymentID },
    'Created MFS Direct Checkout Sandbox Payment',
  );

  return {
    paymentID,
    provider,
    plan,
    amountBdt,
    currency: 'BDT',
    bkashURL: `http://localhost:3000/dashboard/billing?mfs_payment_id=${paymentID}&provider=${provider}&plan=${plan}`,
  };
}

/**
 * Execute MFS Payment following user OTP + PIN verification
 */
export async function executeMfsPayment(
  workspaceId: string,
  paymentID: string,
  provider: 'BKASH' | 'NAGAD',
  plan: PlanTier,
) {
  const trxID = `TRX_${provider}_${Date.now()}`;

  // Update workspace plan and active status
  const updatedWorkspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Record MFS SubscriptionEvent
  await prisma.subscriptionEvent.create({
    data: {
      workspaceId,
      eventType: 'MFS_PAYMENT_SUCCESS',
      provider: provider === 'BKASH' ? PaymentProvider.BKASH : PaymentProvider.NAGAD,
      payload: {
        paymentID,
        trxID,
        provider,
        plan,
        amountBdt: PLAN_LIMITS[plan].priceBdt,
        status: 'Completed',
        completedAt: new Date().toISOString(),
      },
    },
  });

  logger.info(
    { workspaceId, paymentID, trxID, provider, plan },
    'MFS Payment executed successfully',
  );

  return {
    success: true,
    trxID,
    workspace: updatedWorkspace,
  };
}
