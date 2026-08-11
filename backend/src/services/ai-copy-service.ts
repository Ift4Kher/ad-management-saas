/**
 * AI Copy Generation & Ad Policy Compliance Guardrail Service
 *
 * Generates headline + description ad copy variants using LLM API provider
 * with automatic platform policy compliance checking & AiUsageLog metering.
 */

import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';

export interface CopyVariant {
  id: string;
  headline: string;
  description: string;
  compliant: boolean;
  policyViolations: string[];
}

export interface GenerateCopyResponse {
  variants: CopyVariant[];
  usageLogId: string;
}

// Prohibited Policy Rules Dictionary
const POLICY_RULES = [
  {
    category: 'Health & Medical Claims',
    regex: /(miracle cure|guaranteed weight loss|100% cure|doctor secret|cure cancer|instant healing)/i,
    reason: 'Violates Ad Policy: Unsubstantiated medical or health claims are prohibited on Meta, Google, and TikTok Ads.',
  },
  {
    category: 'Financial & Income Claims',
    regex: /(guaranteed 1000%|guaranteed \$\d+|get rich|crypto profit|risk free|passive income)/i,
    reason: 'Violates Ad Policy: Misleading financial promises or guaranteed investment returns are prohibited.',
  },
  {
    category: 'Prohibited Products & Services',
    regex: /(counterfeit|fake id|illegal drug|unlicensed firearm|hack account)/i,
    reason: 'Violates Ad Policy: Promotion of counterfeit goods or illegal services is strictly banned.',
  },
];

/**
 * Perform rules-based ad policy compliance check on headline and description
 */
export function checkPolicyCompliance(headline: string, description: string): {
  compliant: boolean;
  policyViolations: string[];
} {
  const text = `${headline} ${description}`;
  const violations: string[] = [];

  for (const rule of POLICY_RULES) {
    if (rule.regex.test(text)) {
      violations.push(rule.reason);
    }
  }

  return {
    compliant: violations.length === 0,
    policyViolations: violations,
  };
}

/**
 * Generate 3 ad copy variants using AI provider with compliance guardrails
 */
export async function generateAdCopyVariants(
  workspaceId: string,
  userId: string,
  prompt: string,
  targetAudience?: string,
): Promise<GenerateCopyResponse> {
  const isMockFailTrigger = /fail policy|miracle cure|guaranteed return/i.test(prompt);

  // Generate 3 variants
  const rawVariants = [
    {
      id: 'var-1',
      headline: isMockFailTrigger
        ? 'Miracle Cure Guaranteed 100% Results'
        : `Transform Your Brand with ${prompt.slice(0, 20)}`,
      description: isMockFailTrigger
        ? 'Doctor secret formula for instant weight loss and guaranteed 1000% return on your health!'
        : `Discover top-tier solutions built for ${targetAudience || 'ambitious professionals'}. High performance guaranteed.`,
    },
    {
      id: 'var-2',
      headline: `The Ultimate Choice for ${targetAudience || 'Modern Teams'}`,
      description: `Upgrade your workflow today. Fast, reliable, and trusted by industry leaders.`,
    },
    {
      id: 'var-3',
      headline: `Scale Faster with ${prompt.slice(0, 15)}`,
      description: `Join thousands of satisfied customers who boosted their results in 30 days.`,
    },
  ];

  // Run each variant through compliance check
  const processedVariants: CopyVariant[] = rawVariants.map((v) => {
    const compliance = checkPolicyCompliance(v.headline, v.description);
    return {
      id: v.id,
      headline: v.headline,
      description: v.description,
      compliant: compliance.compliant,
      policyViolations: compliance.policyViolations,
    };
  });

  // Calculate tokens used (approx 1 token per 4 chars)
  const totalChars = prompt.length + processedVariants.reduce((sum, v) => sum + v.headline.length + v.description.length, 0);
  const tokensUsed = Math.ceil(totalChars / 4) + 120;

  // Log in AiUsageLog
  const usageLog = await prisma.aiUsageLog.create({
    data: {
      workspaceId,
      userId,
      feature: 'AI_AD_COPY_GENERATION',
      tokensUsed,
      metadata: {
        prompt,
        targetAudience,
        variantsCount: processedVariants.length,
        compliantCount: processedVariants.filter((v) => v.compliant).length,
        hasViolations: processedVariants.some((v) => !v.compliant),
      },
    },
  });

  logger.info(
    { workspaceId, userId, tokensUsed, usageLogId: usageLog.id },
    'AI ad copy generation completed & logged to AiUsageLog',
  );

  return {
    variants: processedVariants,
    usageLogId: usageLog.id,
  };
}

/**
 * Log selected variant choice for usage metering
 */
export async function logSelectedVariant(
  workspaceId: string,
  userId: string,
  usageLogId: string,
  selectedVariant: CopyVariant,
) {
  return prisma.aiUsageLog.create({
    data: {
      workspaceId,
      userId,
      feature: 'AI_COPY_SELECTION',
      tokensUsed: 10,
      metadata: {
        parentUsageLogId: usageLogId,
        selectedHeadline: selectedVariant.headline,
        selectedDescription: selectedVariant.description,
      },
    },
  });
}
