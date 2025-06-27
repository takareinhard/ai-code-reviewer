import { Router, Request, Response } from 'express';
import crypto from 'crypto';

export const webhookRouter = Router();

interface GitHubWebhookPayload {
  action: string;
  pull_request?: {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      sha: string;
      ref: string;
    };
    user: {
      login: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const actualSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(actualSignature, 'hex')
  );
}

webhookRouter.post('/github', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    if (!verifyWebhookSignature(payload, signature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const webhookPayload: GitHubWebhookPayload = req.body;
    const { action, pull_request, repository } = webhookPayload;

    console.log(`Received webhook: ${action} for repository: ${repository.full_name}`);

    if (action === 'opened' || action === 'synchronize') {
      if (pull_request) {
        await handlePullRequestEvent(pull_request, repository);
      }
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handlePullRequestEvent(
  pullRequest: NonNullable<GitHubWebhookPayload['pull_request']>,
  repository: GitHubWebhookPayload['repository']
): Promise<void> {
  console.log(`Processing PR #${pullRequest.number}: ${pullRequest.title}`);
  console.log(`Repository: ${repository.full_name}`);
  console.log(`Head SHA: ${pullRequest.head.sha}`);
  console.log(`Base SHA: ${pullRequest.base.sha}`);
  
  try {
    const { CodeAnalyzer } = await import('../analyzer/code-analyzer');
    const { ClaudeReviewer } = await import('../ai/claude-reviewer');
    const { GitHubClient } = await import('../github/github-client');

    const githubToken = process.env.GITHUB_TOKEN;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!githubToken) {
      throw new Error('GITHUB_TOKEN not configured');
    }
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Initialize services
    const analyzer = new CodeAnalyzer(githubToken);
    const reviewer = new ClaudeReviewer(anthropicApiKey);
    const githubClient = new GitHubClient(githubToken);

    // Analyze the pull request
    const analysisResult = await analyzer.analyzePullRequest(
      repository.owner.login,
      repository.name,
      pullRequest.number
    );

    console.log(`Analysis completed: ${analysisResult.summary.totalFiles} files, ${analysisResult.issues.length} issues found`);

    // Generate AI review
    const reviewSummary = await reviewer.generateReview(analysisResult);
    
    console.log(`Review generated: Score ${reviewSummary.overallScore}/100, ${reviewSummary.comments.length} comments`);

    // Post review to GitHub
    await githubClient.postReviewComment(
      repository.owner.login,
      repository.name,
      pullRequest.number,
      reviewSummary
    );

    // Add score label
    await githubClient.addPullRequestLabel(
      repository.owner.login,
      repository.name,
      pullRequest.number,
      reviewSummary.overallScore
    );

    console.log(`Review posted successfully for PR #${pullRequest.number}`);
  } catch (error) {
    console.error('Error processing pull request:', error);
    throw error;
  }
}