export interface CodeChange {
    filename: string;
    status: 'added' | 'modified' | 'removed';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}
export interface AnalysisResult {
    files: CodeChange[];
    summary: {
        totalFiles: number;
        totalAdditions: number;
        totalDeletions: number;
        languages: string[];
    };
    issues: Issue[];
}
export interface Issue {
    type: 'error' | 'warning' | 'info';
    category: 'syntax' | 'style' | 'security' | 'performance' | 'best-practice';
    message: string;
    file: string;
    line?: number;
    column?: number;
    severity: number;
}
export declare class CodeAnalyzer {
    private octokit;
    constructor(githubToken: string);
    analyzePullRequest(owner: string, repo: string, pullNumber: number): Promise<AnalysisResult>;
    private analyzeFile;
    private containsSecurityIssue;
    private containsQualityIssue;
    private detectLanguage;
}
//# sourceMappingURL=code-analyzer.d.ts.map