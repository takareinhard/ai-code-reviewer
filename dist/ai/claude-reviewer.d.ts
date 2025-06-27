import { AnalysisResult } from '../analyzer/code-analyzer';
export interface ReviewComment {
    file: string;
    line?: number;
    body: string;
    type: 'suggestion' | 'improvement' | 'issue' | 'praise';
    priority: 'low' | 'medium' | 'high';
}
export interface ReviewSummary {
    overallScore: number;
    summary: string;
    recommendations: string[];
    comments: ReviewComment[];
}
export declare class ClaudeReviewer {
    private anthropic;
    constructor(apiKey: string);
    generateReview(analysisResult: AnalysisResult): Promise<ReviewSummary>;
    private buildPrompt;
    private parseReviewResponse;
    private addComment;
}
//# sourceMappingURL=claude-reviewer.d.ts.map