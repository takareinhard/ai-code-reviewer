import { ReviewSummary } from '../ai/claude-reviewer';
export declare class GitHubClient {
    private octokit;
    constructor(githubToken: string);
    postReviewComment(owner: string, repo: string, pullNumber: number, reviewSummary: ReviewSummary): Promise<void>;
    private postLineComment;
    private formatMainReviewBody;
    private formatLineComment;
    private determineReviewEvent;
    private getScoreEmoji;
    private getPriorityEmoji;
    private getTypeEmoji;
    addPullRequestLabel(owner: string, repo: string, pullNumber: number, score: number): Promise<void>;
    private getScoreLabel;
}
//# sourceMappingURL=github-client.d.ts.map