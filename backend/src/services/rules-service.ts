/**
 * Automation Rules Engine Service
 *
 * Evaluates budget and performance rules against campaign metrics.
 *
 * CRITICAL MONEY-AFFECTING RULE (V1 SAFETY GUARDRAIL):
 * Any rule action that changes spend (such as `PAUSE` or budget shifts) MUST NOT execute
 * automatically or silently. Instead, it creates a `PENDING_CONFIRMATION` notification
 * that requires explicit user confirmation via the UI before taking effect!
 */

import { RuleMetric, RuleOperator, RuleAction, NotificationStatus, NotificationType, CampaignStatus } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { getWorkspaceAnalytics } from './analytics-service.js';
import { logger } from '../lib/logger.js';

export interface CreateRuleDTO {
  name: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  action: RuleAction;
  campaignId?: string | null;
}

/**
 * Create a new automation rule for a workspace
 */
export async function createRule(workspaceId: string, data: CreateRuleDTO) {
  return prisma.automationRule.create({
    data: {
      workspaceId,
      campaignId: data.campaignId || null,
      name: data.name,
      metric: data.metric,
      operator: data.operator,
      threshold: data.threshold,
      action: data.action,
      enabled: true,
    },
  });
}

/**
 * List all rules for a workspace
 */
export async function listRules(workspaceId: string) {
  return prisma.automationRule.findMany({
    where: { workspaceId },
    include: {
      campaign: { select: { id: true, name: true, platform: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Delete an automation rule
 */
export async function deleteRule(workspaceId: string, ruleId: string) {
  return prisma.automationRule.deleteMany({
    where: { id: ruleId, workspaceId },
  });
}

/**
 * Evaluate all enabled automation rules for a workspace against current campaign performance metrics.
 */
export async function evaluateRulesForWorkspace(workspaceId: string): Promise<{
  rulesEvaluated: number;
  triggeredCount: number;
  notificationsCreated: number;
}> {
  const rules = await prisma.automationRule.findMany({
    where: { workspaceId, enabled: true },
  });

  if (rules.length === 0) {
    return { rulesEvaluated: 0, triggeredCount: 0, notificationsCreated: 0 };
  }

  // Fetch campaign analytics for the workspace over last 30 days
  const analytics = await getWorkspaceAnalytics(workspaceId, { period: '30d' });
  const perfMap = new Map(analytics.campaignPerformance.map((c) => [c.id, c]));

  let triggeredCount = 0;
  let notificationsCreated = 0;

  for (const rule of rules) {
    // Determine target campaigns (either specific campaign or all campaigns)
    const targetCampaigns = rule.campaignId
      ? analytics.campaignPerformance.filter((c) => c.id === rule.campaignId)
      : analytics.campaignPerformance;

    for (const campaign of targetCampaigns) {
      let metricValue = 0;
      if (rule.metric === 'SPEND') metricValue = campaign.spend;
      if (rule.metric === 'CPA') metricValue = campaign.cpa;
      if (rule.metric === 'ROAS') metricValue = campaign.roas;

      const threshold = Number(rule.threshold);
      let isTriggered = false;

      if (rule.operator === 'GREATER_THAN') {
        isTriggered = metricValue > threshold;
      } else if (rule.operator === 'LESS_THAN') {
        isTriggered = metricValue < threshold;
      }

      if (isTriggered) {
        triggeredCount++;

        // LOG EMAIL AUDIT EVENT
        logger.info(
          {
            event: 'EMAIL_WOULD_BE_SENT',
            workspaceId,
            ruleId: rule.id,
            campaignId: campaign.id,
            action: rule.action,
            metric: rule.metric,
            metricValue,
            threshold,
          },
          `[EMAIL WOULD BE SENT] Rule "${rule.name}" triggered for campaign "${campaign.name}" (${rule.metric}: ${metricValue} vs threshold ${threshold})`,
        );

        if (rule.action === 'NOTIFY') {
          // Non-money-affecting: create simple INFO/WARNING notification
          await prisma.notification.create({
            data: {
              workspaceId,
              ruleId: rule.id,
              campaignId: campaign.id,
              title: `Rule Alert: ${rule.name}`,
              message: `Campaign "${campaign.name}" triggered rule "${rule.name}". Current ${rule.metric} is ${metricValue} (Threshold: ${threshold}).`,
              type: 'WARNING',
              status: 'UNREAD',
            },
          });
          notificationsCreated++;
        } else if (rule.action === 'PAUSE') {
          // MONEY-AFFECTING ACTION: Requires explicit user confirmation step!
          // Check if there is already a PENDING_CONFIRMATION notification for this rule+campaign
          const existingPending = await prisma.notification.findFirst({
            where: {
              workspaceId,
              ruleId: rule.id,
              campaignId: campaign.id,
              status: 'PENDING_CONFIRMATION',
            },
          });

          if (!existingPending) {
            await prisma.notification.create({
              data: {
                workspaceId,
                ruleId: rule.id,
                campaignId: campaign.id,
                title: `Action Required: Confirm Pause Campaign "${campaign.name}"`,
                message: `Rule "${rule.name}" triggered (${rule.metric} ${metricValue} ${rule.operator === 'GREATER_THAN' ? '>' : '<'} ${threshold}). Click to confirm pausing this campaign.`,
                type: 'ACTION_REQUIRED',
                status: 'PENDING_CONFIRMATION',
                actionType: 'PAUSE_CAMPAIGN',
              },
            });
            notificationsCreated++;
          }
        }

        // Update rule lastTriggeredAt
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastTriggeredAt: new Date() },
        });
      }
    }
  }

  return {
    rulesEvaluated: rules.length,
    triggeredCount,
    notificationsCreated,
  };
}

/**
 * Confirm a pending notification action (e.g. Pause Campaign).
 * Executes the money-affecting action upon explicit user confirmation.
 */
export async function confirmNotificationAction(workspaceId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, workspaceId, status: 'PENDING_CONFIRMATION' },
  });

  if (!notification) {
    throw new Error('Notification not found or action already processed.');
  }

  if (notification.actionType === 'PAUSE_CAMPAIGN' && notification.campaignId) {
    // Perform money-affecting action: update campaign status to PAUSED
    await prisma.campaign.update({
      where: { id: notification.campaignId },
      data: { status: CampaignStatus.PAUSED },
    });

    logger.info(
      { workspaceId, campaignId: notification.campaignId, notificationId },
      'Money-affecting action EXECUTED following explicit user confirmation',
    );
  }

  // Update notification status to CONFIRMED
  return prisma.notification.update({
    where: { id: notificationId },
    data: { status: NotificationStatus.CONFIRMED },
  });
}

/**
 * Dismiss a notification or reject an action
 */
export async function dismissNotification(workspaceId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, workspaceId },
  });

  if (!notification) {
    throw new Error('Notification not found.');
  }

  const newStatus = notification.status === 'PENDING_CONFIRMATION' ? 'REJECTED' : 'READ';

  return prisma.notification.update({
    where: { id: notificationId },
    data: { status: newStatus },
  });
}
