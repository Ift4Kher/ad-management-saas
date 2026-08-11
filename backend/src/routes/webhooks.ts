/**
 * External Webhook Receivers
 *
 * Receives lifecycle events for Stripe card subscriptions and MFS payment notifications.
 */

import { Router, type Request, type Response } from 'express';
import { processStripeWebhookEvent } from '../services/billing-service.js';
import { logger } from '../lib/logger.js';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/stripe
 * Stripe subscription lifecycle webhook receiver
 */
webhooksRouter.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  try {
    const event = req.body;
    await processStripeWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Error handling Stripe webhook');
    res.status(400).json({ error: 'Webhook handler failed.' });
  }
});
