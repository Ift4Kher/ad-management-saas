/**
 * Workspace Management & Campaign Test Routes
 *
 * Implements workspace creation, listing, details, and RBAC-protected actions.
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/db.js';
import { redis } from '../lib/redis.js';
import { requireAuth, requireWorkspaceAccess, requireEmailVerified } from '../middleware/auth.js';
import { WorkspaceRole, Platform, CampaignStatus, RuleMetric, RuleOperator, RuleAction, AssetType, PlanTier } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { publishCampaign, retryPublish } from '../services/publish-service.js';
import { getWorkspaceAnalytics } from '../services/analytics-service.js';
import {
  createRule,
  listRules,
  deleteRule,
  evaluateRulesForWorkspace,
  confirmNotificationAction,
  dismissNotification,
} from '../services/rules-service.js';
import { createCreativeAsset, listCreativeAssets, deleteCreativeAsset } from '../services/creative-service.js';
import { generateAdCopyVariants, logSelectedVariant } from '../services/ai-copy-service.js';
import {
  listTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
} from '../services/team-service.js';
import {
  getWorkspaceUsageAndPlan,
  createStripeCheckoutSession,
  createMfsCheckout,
  executeMfsPayment,
} from '../services/billing-service.js';

export const workspacesRouter = Router();

/**
 * GET /api/workspaces
 * Returns list of workspaces the authenticated user belongs to.
 */
workspacesRouter.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            _count: {
              select: { members: true, campaigns: true, adAccountConnections: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      role: m.role,
      locale: m.workspace.locale,
      createdAt: m.workspace.createdAt,
      stats: {
        memberCount: m.workspace._count.members,
        campaignCount: m.workspace._count.campaigns,
        adAccountCount: m.workspace._count.adAccountConnections,
      },
    }));

    res.json({ workspaces });
  } catch (err) {
    logger.error({ err }, 'Error listing workspaces');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/workspaces/admin/stats
 * Global Super Admin System Statistics (Requires Super Admin email).
 * MUST BE MOUNTED BEFORE /:workspaceId TO AVOID EXPRESS ROUTE PARAM CONFLICTS.
 */
workspacesRouter.get(
  '/admin/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.email !== 'admin@adsync.com') {
        res.status(403).json({ error: 'Forbidden: Super Admin access required.' });
        return;
      }

      // 1. Check Redis Cache for Instant Response
      if (redis) {
        try {
          const cached = await redis.get('adsync:admin_stats');
          if (cached) {
            res.json(JSON.parse(cached));
            return;
          }
        } catch {
          // Fallthrough to DB if Redis cache misses
        }
      }

      // 2. Run all database queries concurrently in Parallel
      const [
        totalUsers,
        totalWorkspaces,
        totalCampaigns,
        totalConnections,
        aiAgg,
        workspacesList,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.workspace.count(),
        prisma.campaign.count(),
        prisma.adAccountConnection.count(),
        prisma.aiUsageLog.aggregate({ _sum: { tokensUsed: true } }),
        prisma.workspace.findMany({
          include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { members: true, campaigns: true, adAccountConnections: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const responseData = {
        systemStats: {
          totalUsers,
          totalWorkspaces,
          totalCampaigns,
          totalConnections,
          totalAiTokensUsed: aiAgg._sum.tokensUsed || 0,
        },
        workspaces: workspacesList,
      };

      // Cache result in Redis for 10 seconds
      if (redis) {
        try {
          await redis.setex('adsync:admin_stats', 10, JSON.stringify(responseData));
        } catch {
          // ignore cache write errors
        }
      }

      res.json(responseData);
    } catch (err) {
      logger.error({ err }, 'Error fetching system admin stats');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces
 * Create a new workspace and assign current user as OWNER.
 */
workspacesRouter.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { name, locale } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Workspace name is required.' });
      return;
    }

    const { workspace, member } = await prisma.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: name.trim(),
          ownerId: user.id,
          locale: locale || 'en',
        },
      });

      const newMember = await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: newWorkspace.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return { workspace: newWorkspace, member: newMember };
    });

    logger.info({ userId: user.id, workspaceId: workspace.id }, 'Created new workspace');

    res.status(201).json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        role: member.role,
        locale: workspace.locale,
        createdAt: workspace.createdAt,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Error creating workspace');
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * GET /api/workspaces/:workspaceId
 * Returns detailed workspace information.
 * Enforces requireWorkspaceAccess(VIEWER).
 */
workspacesRouter.get(
  '/:workspaceId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const scopedDb = req.scopedDb!;

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
            },
          },
        },
      });

      if (!workspace) {
        res.status(404).json({ error: 'Workspace not found.' });
        return;
      }

      // Fetch campaigns using automatic workspace scoping
      const campaigns = await scopedDb.campaign.findMany({ take: 10 });
      const connections = await scopedDb.adAccountConnection.findMany();

      res.json({
        workspace: {
          id: workspace.id,
          name: workspace.name,
          owner: workspace.owner,
          locale: workspace.locale,
          userRole: req.memberRole,
          members: workspace.members.map((m) => ({
            userId: m.user.id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            emailVerified: !!m.user.emailVerifiedAt,
          })),
          campaigns,
          adAccountConnections: connections.map((c) => ({
            id: c.id,
            platform: c.platform,
            status: c.status,
            connectedAt: c.connectedAt,
          })),
        },
      });
    } catch (err) {
      logger.error({ err }, 'Error getting workspace details');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/campaigns
 * Create a new campaign inside workspace.
 * Requires:
 * - Valid Auth Session
 * - Minimum 'EDITOR' role in workspace (blocks VIEWER role)
 * - Verified email address (requireEmailVerified)
 * Uses automatic workspace scoping (req.scopedDb).
 */
workspacesRouter.post(
  '/:workspaceId/campaigns',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scopedDb = req.scopedDb!;
      const { name, platform, objective, budget, metadata } = req.body;

      if (!name || !platform || !objective || budget === undefined) {
        res.status(400).json({ error: 'Name, platform, objective, and budget are required.' });
        return;
      }

      const campaign = await (scopedDb.campaign as any).create({
        data: {
          name: name.trim(),
          platform: platform as Platform,
          objective,
          budget: Number(budget),
          status: CampaignStatus.DRAFT,
          metadata: (metadata || null) as any,
        },
      });

      logger.info({ workspaceId: req.workspaceId, campaignId: campaign.id }, 'Campaign created');

      res.status(201).json({ campaign });
    } catch (err) {
      logger.error({ err }, 'Error creating campaign');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/campaigns
 * List all campaigns inside a workspace.
 */
workspacesRouter.get(
  '/:workspaceId/campaigns',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const scopedDb = req.scopedDb!;
      const campaigns = await scopedDb.campaign.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.json({ campaigns });
    } catch (err) {
      logger.error({ err }, 'Error fetching campaigns');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/campaigns/:campaignId
 * Get campaign detail including all publish attempts.
 */
workspacesRouter.get(
  '/:workspaceId/campaigns/:campaignId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaignId = req.params.campaignId as string;
      const workspaceId = req.workspaceId!;

      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, workspaceId },
        include: {
          publishAttempts: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found.' });
        return;
      }

      // Deduplicate: return only the latest attempt per platform
      const latestByPlatform = new Map<string, typeof campaign.publishAttempts[0]>();
      for (const attempt of campaign.publishAttempts) {
        if (!latestByPlatform.has(attempt.platform)) {
          latestByPlatform.set(attempt.platform, attempt);
        }
      }

      res.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          platform: campaign.platform,
          objective: campaign.objective,
          status: campaign.status,
          budget: campaign.budget,
          metadata: campaign.metadata,
          createdAt: campaign.createdAt,
          updatedAt: campaign.updatedAt,
        },
        publishAttempts: Array.from(latestByPlatform.values()).map((a) => ({
          id: a.id,
          platform: a.platform,
          status: a.status,
          externalId: a.externalId,
          errorMessage: a.errorMessage,
          errorCode: a.errorCode,
          attemptNumber: a.attemptNumber,
          createdAt: a.createdAt,
        })),
      });
    } catch (err) {
      logger.error({ err }, 'Error fetching campaign detail');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/campaigns/:campaignId/publish
 * Publish a campaign to its selected platform.
 * Requires EDITOR role + verified email.
 */
workspacesRouter.post(
  '/:workspaceId/campaigns/:campaignId/publish',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaignId = req.params.campaignId as string;
      const workspaceId = req.workspaceId!;

      // Verify campaign belongs to workspace
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, workspaceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found.' });
        return;
      }

      const result = await publishCampaign(campaignId, campaign.platform);

      logger.info(
        { workspaceId, campaignId, platform: campaign.platform, attemptId: result.attemptId },
        'Campaign publish initiated',
      );

      res.json({
        message: `Publishing to ${campaign.platform} started.`,
        attemptId: result.attemptId,
        jobId: result.jobId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish campaign.';
      logger.error({ err }, 'Error publishing campaign');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/campaigns/:campaignId/retry/:platform
 * Retry a failed publish for a specific platform.
 * Requires EDITOR role + verified email.
 */
workspacesRouter.post(
  '/:workspaceId/campaigns/:campaignId/retry/:platform',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const campaignId = req.params.campaignId as string;
      const platform = req.params.platform as string;
      const workspaceId = req.workspaceId!;

      // Validate platform
      if (!['GOOGLE', 'META', 'TIKTOK'].includes(platform)) {
        res.status(400).json({ error: `Invalid platform: ${platform}` });
        return;
      }

      // Verify campaign belongs to workspace
      const campaign = await prisma.campaign.findFirst({
        where: { id: campaignId, workspaceId },
      });

      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found.' });
        return;
      }

      const result = await retryPublish(campaignId, platform as Platform);

      logger.info(
        { workspaceId, campaignId, platform, attemptId: result.attemptId },
        'Campaign retry initiated',
      );

      res.json({
        message: `Retrying publish on ${platform}.`,
        attemptId: result.attemptId,
        jobId: result.jobId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to retry publish.';
      logger.error({ err }, 'Error retrying campaign publish');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/analytics
 * Get aggregated performance reporting analytics for a workspace with filters.
 * Requires VIEWER role.
 */
workspacesRouter.get(
  '/:workspaceId/analytics',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { period, startDate, endDate, platform, campaignId } = req.query;

      const analytics = await getWorkspaceAnalytics(workspaceId, {
        period: (period as any) || '7d',
        startDate: startDate as string,
        endDate: endDate as string,
        platform: (platform as any) || 'ALL',
        campaignId: (campaignId as string) || 'ALL',
      });

      res.json(analytics);
    } catch (err) {
      logger.error({ err }, 'Error generating workspace analytics');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/rules
 * List all automation rules for a workspace.
 */
workspacesRouter.get(
  '/:workspaceId/rules',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const rules = await listRules(workspaceId);
      res.json({ rules });
    } catch (err) {
      logger.error({ err }, 'Error listing rules');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/rules
 * Create an automation rule.
 */
workspacesRouter.post(
  '/:workspaceId/rules',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { name, metric, operator, threshold, action, campaignId } = req.body;

      if (!name || !metric || !operator || threshold === undefined || !action) {
        res.status(400).json({ error: 'Missing required rule fields: name, metric, operator, threshold, action' });
        return;
      }

      const rule = await createRule(workspaceId, {
        name,
        metric: metric as RuleMetric,
        operator: operator as RuleOperator,
        threshold: Number(threshold),
        action: action as RuleAction,
        campaignId: campaignId || null,
      });

      res.status(201).json({ rule });
    } catch (err) {
      logger.error({ err }, 'Error creating rule');
      res.status(500).json({ error: 'Failed to create automation rule.' });
    }
  },
);

/**
 * DELETE /api/workspaces/:workspaceId/rules/:ruleId
 * Delete an automation rule.
 */
workspacesRouter.delete(
  '/:workspaceId/rules/:ruleId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const ruleId = req.params.ruleId as string;
      await deleteRule(workspaceId, ruleId);
      res.json({ message: 'Rule deleted successfully.' });
    } catch (err) {
      logger.error({ err }, 'Error deleting rule');
      res.status(500).json({ error: 'Failed to delete rule.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/rules/evaluate
 * Trigger manual rule evaluation for a workspace.
 */
workspacesRouter.post(
  '/:workspaceId/rules/evaluate',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const result = await evaluateRulesForWorkspace(workspaceId);
      res.json({ message: 'Rule evaluation completed.', ...result });
    } catch (err) {
      logger.error({ err }, 'Error evaluating rules');
      res.status(500).json({ error: 'Failed to evaluate rules.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/notifications
 * List active notifications for a workspace.
 */
workspacesRouter.get(
  '/:workspaceId/notifications',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const notifications = await prisma.notification.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: { select: { id: true, name: true, platform: true } },
          rule: { select: { id: true, name: true } },
        },
      });
      res.json({ notifications });
    } catch (err) {
      logger.error({ err }, 'Error fetching notifications');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/notifications/:id/confirm
 * EXPLICIT CONFIRMATION STEP: Executes money-affecting actions (e.g. Pause Campaign).
 */
workspacesRouter.post(
  '/:workspaceId/notifications/:id/confirm',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const id = req.params.id as string;
      const notification = await confirmNotificationAction(workspaceId, id);
      res.json({ message: 'Action confirmed and executed successfully.', notification });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm action.';
      logger.error({ err }, 'Error confirming notification action');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/notifications/:id/dismiss
 * Dismiss notification or reject action.
 */
workspacesRouter.post(
  '/:workspaceId/notifications/:id/dismiss',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const id = req.params.id as string;
      const notification = await dismissNotification(workspaceId, id);
      res.json({ message: 'Notification dismissed.', notification });
    } catch (err) {
      logger.error({ err }, 'Error dismissing notification');
      res.status(400).json({ error: 'Failed to dismiss notification.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/creatives
 * List creative assets for a workspace.
 */
workspacesRouter.get(
  '/:workspaceId/creatives',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { type } = req.query;
      const creatives = await listCreativeAssets(workspaceId, type as AssetType | undefined);
      res.json({ creatives });
    } catch (err) {
      logger.error({ err }, 'Error listing creative assets');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/creatives
 * Create a creative asset.
 */
workspacesRouter.post(
  '/:workspaceId/creatives',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { name, type, url, content, metadata, aiGenerated } = req.body;

      if (!name || !type || !url) {
        res.status(400).json({ error: 'Missing required fields: name, type, url' });
        return;
      }

      const creative = await createCreativeAsset(workspaceId, {
        name,
        type: type as AssetType,
        url,
        content,
        metadata,
        aiGenerated,
      });

      res.status(201).json({ creative });
    } catch (err) {
      logger.error({ err }, 'Error creating creative asset');
      res.status(500).json({ error: 'Failed to create creative asset.' });
    }
  },
);

/**
 * DELETE /api/workspaces/:workspaceId/creatives/:id
 * Delete a creative asset.
 */
workspacesRouter.delete(
  '/:workspaceId/creatives/:id',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const id = req.params.id as string;
      await deleteCreativeAsset(workspaceId, id);
      res.json({ message: 'Asset deleted successfully.' });
    } catch (err) {
      logger.error({ err }, 'Error deleting creative asset');
      res.status(500).json({ error: 'Failed to delete asset.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/ai/generate-copy
 * AI Generate Ad Copy with automatic Policy Compliance check & AiUsageLog metering.
 */
workspacesRouter.post(
  '/:workspaceId/ai/generate-copy',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const userId = req.user!.id;
      const { prompt, targetAudience } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Missing product/service description prompt.' });
        return;
      }

      const result = await generateAdCopyVariants(workspaceId, userId, prompt, targetAudience);
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'Error generating AI ad copy');
      res.status(500).json({ error: 'Failed to generate AI ad copy.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/ai/log-selection
 * Log selected variant choice for usage metering.
 */
workspacesRouter.post(
  '/:workspaceId/ai/log-selection',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.EDITOR),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const userId = req.user!.id;
      const { usageLogId, selectedVariant } = req.body;

      if (!usageLogId || !selectedVariant) {
        res.status(400).json({ error: 'Missing usageLogId or selectedVariant.' });
        return;
      }

      const log = await logSelectedVariant(workspaceId, userId, usageLogId, selectedVariant);
      res.json({ message: 'Selection logged successfully.', log });
    } catch (err) {
      logger.error({ err }, 'Error logging variant selection');
      res.status(500).json({ error: 'Failed to log selection.' });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/members
 * List team members for a workspace.
 */
workspacesRouter.get(
  '/:workspaceId/members',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const members = await listTeamMembers(workspaceId);
      res.json({ members });
    } catch (err) {
      logger.error({ err }, 'Error listing team members');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/members/invite
 * Invite a new member by email (Requires ADMIN role).
 */
workspacesRouter.post(
  '/:workspaceId/members/invite',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { email, role } = req.body;

      if (!email || !role) {
        res.status(400).json({ error: 'Missing required fields: email, role' });
        return;
      }

      const membership = await inviteTeamMember(workspaceId, email, role as WorkspaceRole);
      res.status(201).json({ membership });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invite team member.';
      logger.error({ err }, 'Error inviting team member');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * PATCH /api/workspaces/:workspaceId/members/:userId
 * Update member role (Requires ADMIN role).
 */
workspacesRouter.patch(
  '/:workspaceId/members/:userId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const userId = req.params.userId as string;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ error: 'Missing required field: role' });
        return;
      }

      const membership = await updateMemberRole(workspaceId, userId, role as WorkspaceRole);
      res.json({ membership });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update role.';
      logger.error({ err }, 'Error updating member role');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 * Remove member from workspace (Requires ADMIN role).
 */
workspacesRouter.delete(
  '/:workspaceId/members/:userId',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const userId = req.params.userId as string;

      await removeTeamMember(workspaceId, userId);
      res.json({ message: 'Team member removed successfully.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member.';
      logger.error({ err }, 'Error removing team member');
      res.status(400).json({ error: message });
    }
  },
);

/**
 * GET /api/workspaces/:workspaceId/billing
 * Get current plan, usage metrics, and subscription status.
 */
workspacesRouter.get(
  '/:workspaceId/billing',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.VIEWER),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const data = await getWorkspaceUsageAndPlan(workspaceId);
      res.json(data);
    } catch (err) {
      logger.error({ err }, 'Error fetching workspace billing info');
      res.status(500).json({ error: 'Internal server error.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/billing/stripe/checkout
 * Initiate Stripe Card Subscription Checkout (Requires ADMIN role).
 */
workspacesRouter.post(
  '/:workspaceId/billing/stripe/checkout',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { plan } = req.body;

      if (!plan || !['STARTER', 'GROWTH', 'AGENCY'].includes(plan)) {
        res.status(400).json({ error: 'Invalid plan tier specified.' });
        return;
      }

      const session = await createStripeCheckoutSession(workspaceId, plan as PlanTier);
      res.json(session);
    } catch (err) {
      logger.error({ err }, 'Error creating Stripe checkout session');
      res.status(500).json({ error: 'Failed to initiate Stripe checkout.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/billing/mfs/checkout
 * Initiate bKash / Nagad Direct Mobile Wallet Checkout (Requires ADMIN role).
 */
workspacesRouter.post(
  '/:workspaceId/billing/mfs/checkout',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { provider, plan } = req.body;

      if (!provider || !['BKASH', 'NAGAD'].includes(provider) || !plan) {
        res.status(400).json({ error: 'Missing provider (BKASH/NAGAD) or plan tier.' });
        return;
      }

      const checkout = await createMfsCheckout(workspaceId, provider, plan as PlanTier);
      res.json(checkout);
    } catch (err) {
      logger.error({ err }, 'Error creating MFS checkout payment');
      res.status(500).json({ error: 'Failed to initiate MFS payment.' });
    }
  },
);

/**
 * POST /api/workspaces/:workspaceId/billing/mfs/execute
 * Execute MFS Payment following OTP + PIN verification (Requires ADMIN role).
 */
workspacesRouter.post(
  '/:workspaceId/billing/mfs/execute',
  requireAuth,
  requireWorkspaceAccess(WorkspaceRole.ADMIN),
  requireEmailVerified,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const workspaceId = req.workspaceId!;
      const { paymentID, provider, plan } = req.body;

      if (!paymentID || !provider || !plan) {
        res.status(400).json({ error: 'Missing paymentID, provider, or plan tier.' });
        return;
      }

      const result = await executeMfsPayment(workspaceId, paymentID, provider, plan as PlanTier);
      res.json(result);
    } catch (err) {
      logger.error({ err }, 'Error executing MFS payment');
      res.status(500).json({ error: 'Failed to complete MFS payment.' });
    }
  },
);
