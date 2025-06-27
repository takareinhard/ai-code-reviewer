"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
exports.webhookRouter = (0, express_1.Router)();
// GET route for testing webhook endpoint
exports.webhookRouter.get('/github', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>GitHub Webhook Status</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { color: #28a745; font-weight: bold; }
        .method { color: #007bff; font-weight: bold; }
        .note { color: #6c757d; font-style: italic; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 AI Code Reviewer</h1>
        <p class="status">✅ GitHub webhook endpoint is active</p>
        <p><strong>Expected Method:</strong> <span class="method">POST</span></p>
        <p class="note">📝 This endpoint expects POST requests from GitHub webhooks</p>
        <hr>
        <p><strong>Webhook URL:</strong> <code>/webhook/github</code></p>
        <p><strong>Status:</strong> Ready to receive GitHub webhook events</p>
      </div>
    </body>
    </html>
  `);
});
function verifyWebhookSignature(payload, signature) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        console.warn('GITHUB_WEBHOOK_SECRET not configured');
        return false;
    }
    const expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    const actualSignature = signature.replace('sha256=', '');
    return crypto_1.default.timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(actualSignature, 'hex'));
}
exports.webhookRouter.post('/github', async (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'];
        const payload = JSON.stringify(req.body);
        if (!verifyWebhookSignature(payload, signature)) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        const webhookPayload = req.body;
        const { action, pull_request, repository } = webhookPayload;
        console.log(`Received webhook: ${action} for repository: ${repository.full_name}`);
        if (action === 'opened' || action === 'synchronize') {
            if (pull_request) {
                await handlePullRequestEvent(pull_request, repository);
            }
        }
        res.status(200).json({ message: 'Webhook processed successfully' });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
async function handlePullRequestEvent(pullRequest, repository) {
    console.log(`Processing PR #${pullRequest.number}: ${pullRequest.title}`);
    console.log(`Repository: ${repository.full_name}`);
    console.log(`Head SHA: ${pullRequest.head.sha}`);
    console.log(`Base SHA: ${pullRequest.base.sha}`);
    try {
        const { CodeAnalyzer } = await Promise.resolve().then(() => __importStar(require('../analyzer/code-analyzer')));
        const { ClaudeReviewer } = await Promise.resolve().then(() => __importStar(require('../ai/claude-reviewer')));
        const { GitHubClient } = await Promise.resolve().then(() => __importStar(require('../github/github-client')));
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
        const analysisResult = await analyzer.analyzePullRequest(repository.owner.login, repository.name, pullRequest.number);
        console.log(`Analysis completed: ${analysisResult.summary.totalFiles} files, ${analysisResult.issues.length} issues found`);
        // Generate AI review
        const reviewSummary = await reviewer.generateReview(analysisResult);
        console.log(`Review generated: Score ${reviewSummary.overallScore}/100, ${reviewSummary.comments.length} comments`);
        // Post review to GitHub
        await githubClient.postReviewComment(repository.owner.login, repository.name, pullRequest.number, reviewSummary);
        // Add score label
        await githubClient.addPullRequestLabel(repository.owner.login, repository.name, pullRequest.number, reviewSummary.overallScore);
        console.log(`Review posted successfully for PR #${pullRequest.number}`);
    }
    catch (error) {
        console.error('Error processing pull request:', error);
        throw error;
    }
}
//# sourceMappingURL=webhook-handler.js.map