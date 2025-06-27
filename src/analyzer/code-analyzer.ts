import { Octokit } from '@octokit/rest';

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
  severity: number; // 1-10
}

export class CodeAnalyzer {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({
      auth: githubToken,
    });
  }

  async analyzePullRequest(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<AnalysisResult> {
    try {
      // Get PR files
      const { data: files } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });

      const codeChanges: CodeChange[] = files.map(file => ({
        filename: file.filename,
        status: file.status as 'added' | 'modified' | 'removed',
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));

      // Analyze each file
      const issues: Issue[] = [];
      const languages = new Set<string>();

      for (const change of codeChanges) {
        const fileIssues = await this.analyzeFile(change);
        issues.push(...fileIssues);
        
        const language = this.detectLanguage(change.filename);
        if (language) {
          languages.add(language);
        }
      }

      const summary = {
        totalFiles: codeChanges.length,
        totalAdditions: codeChanges.reduce((sum, file) => sum + file.additions, 0),
        totalDeletions: codeChanges.reduce((sum, file) => sum + file.deletions, 0),
        languages: Array.from(languages),
      };

      return {
        files: codeChanges,
        summary,
        issues,
      };
    } catch (error) {
      console.error('Error analyzing pull request:', error);
      throw error;
    }
  }

  private async analyzeFile(change: CodeChange): Promise<Issue[]> {
    const issues: Issue[] = [];

    if (!change.patch) {
      return issues;
    }

    // Basic pattern matching for common issues
    const lines = change.patch.split('\n');
    let currentLine = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse line number from hunk header
        const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
        if (match) {
          currentLine = parseInt(match[1]) - 1;
        }
        continue;
      }

      if (line.startsWith('+')) {
        currentLine++;
        const content = line.substring(1);
        
        // Check for security issues
        if (this.containsSecurityIssue(content)) {
          issues.push({
            type: 'error',
            category: 'security',
            message: 'Potential security vulnerability detected',
            file: change.filename,
            line: currentLine,
            severity: 8,
          });
        }

        // Check for code quality issues
        if (this.containsQualityIssue(content)) {
          issues.push({
            type: 'warning',
            category: 'best-practice',
            message: 'Code quality issue detected',
            file: change.filename,
            line: currentLine,
            severity: 5,
          });
        }
      }
    }

    return issues;
  }

  private containsSecurityIssue(content: string): boolean {
    const securityPatterns = [
      /console\.log.*password/i,
      /console\.log.*token/i,
      /console\.log.*secret/i,
      /eval\s*\(/,
      /document\.write\s*\(/,
      /innerHTML\s*=/,
      /\.exec\s*\(/,
    ];

    return securityPatterns.some(pattern => pattern.test(content));
  }

  private containsQualityIssue(content: string): boolean {
    const qualityPatterns = [
      // Long lines
      /.{120,}/,
      // TODO comments
      /TODO|FIXME|HACK/i,
      // Console.log in production code
      /console\.log/,
      // Unused variables (basic check)
      /var\s+\w+\s*=.*;\s*$/,
    ];

    return qualityPatterns.some(pattern => pattern.test(content));
  }

  private detectLanguage(filename: string): string | null {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'jsx': 'React',
      'ts': 'TypeScript',
      'tsx': 'React TypeScript',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'go': 'Go',
      'rs': 'Rust',
      'php': 'PHP',
      'rb': 'Ruby',
    };

    return extension ? languageMap[extension] || null : null;
  }
}