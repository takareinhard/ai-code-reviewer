import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult, Issue } from '../analyzer/code-analyzer';

export interface ReviewComment {
  file: string;
  line?: number;
  body: string;
  type: 'suggestion' | 'improvement' | 'issue' | 'praise';
  priority: 'low' | 'medium' | 'high';
}

export interface ReviewSummary {
  overallScore: number; // 0-100
  summary: string;
  recommendations: string[];
  comments: ReviewComment[];
}

export class ClaudeReviewer {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateReview(analysisResult: AnalysisResult): Promise<ReviewSummary> {
    try {
      const prompt = this.buildPrompt(analysisResult);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const reviewContent = response.content[0];
      if (reviewContent.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }

      return this.parseReviewResponse(reviewContent.text, analysisResult);
    } catch (error) {
      console.error('Error generating review with Claude:', error);
      throw error;
    }
  }

  private buildPrompt(analysisResult: AnalysisResult): string {
    return `
あなたは経験豊富なソフトウェアエンジニアとして、以下のプルリクエストの詳細なコードレビューを行ってください。

## プルリクエスト概要
- 変更ファイル数: ${analysisResult.summary.totalFiles}
- 追加行数: ${analysisResult.summary.totalAdditions}
- 削除行数: ${analysisResult.summary.totalDeletions}
- 主な言語: ${analysisResult.summary.languages.join(', ')}

## 変更されたファイル
${analysisResult.files.map(file => `
### ${file.filename} (${file.status})
- 追加: ${file.additions}行, 削除: ${file.deletions}行
${file.patch ? `\`\`\`diff\n${file.patch.substring(0, 1000)}${file.patch.length > 1000 ? '...' : ''}\n\`\`\`` : ''}
`).join('\n')}

## 検出された問題
${analysisResult.issues.map(issue => `
- [${issue.severity}/10] ${issue.category}: ${issue.message} (${issue.file}${issue.line ? `:${issue.line}` : ''})
`).join('\n')}

## レビュー要求
以下の形式でレビューを提供してください：

### OVERALL_SCORE: [0-100の数値]

### SUMMARY:
[プルリクエスト全体の簡潔な評価]

### RECOMMENDATIONS:
1. [推奨事項1]
2. [推奨事項2]
3. [推奨事項3]

### COMMENTS:
[各コメントは以下の形式で]
FILE: [ファイル名]
LINE: [行番号（該当する場合）]
TYPE: [suggestion|improvement|issue|praise]
PRIORITY: [low|medium|high]
BODY: [具体的なコメント内容]
---

特に以下の観点から評価してください：
1. セキュリティ（機密情報の漏洩、脆弱性の有無）
2. パフォーマンス（効率的なアルゴリズム、メモリ使用量）
3. 可読性（コードの明確さ、命名規則）
4. 保守性（モジュール化、テスタビリティ）
5. ベストプラクティス（言語固有の慣習、設計パターン）

建設的で具体的なフィードバックを提供し、改善提案も含めてください。
    `.trim();
  }

  private parseReviewResponse(response: string, analysisResult: AnalysisResult): ReviewSummary {
    const lines = response.split('\n');
    let overallScore = 75; // Default score
    let summary = '';
    const recommendations: string[] = [];
    const comments: ReviewComment[] = [];

    let currentSection = '';
    let currentComment: Partial<ReviewComment> = {};

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('OVERALL_SCORE:')) {
        const scoreMatch = trimmedLine.match(/(\d+)/);
        if (scoreMatch) {
          overallScore = Math.min(100, Math.max(0, parseInt(scoreMatch[1])));
        }
      } else if (trimmedLine.startsWith('SUMMARY:')) {
        currentSection = 'summary';
      } else if (trimmedLine.startsWith('RECOMMENDATIONS:')) {
        currentSection = 'recommendations';
      } else if (trimmedLine.startsWith('COMMENTS:')) {
        currentSection = 'comments';
      } else if (trimmedLine.startsWith('FILE:')) {
        if (currentComment.file) {
          this.addComment(comments, currentComment);
        }
        currentComment = { file: trimmedLine.replace('FILE:', '').trim() };
      } else if (trimmedLine.startsWith('LINE:')) {
        const lineNum = parseInt(trimmedLine.replace('LINE:', '').trim());
        if (!isNaN(lineNum)) {
          currentComment.line = lineNum;
        }
      } else if (trimmedLine.startsWith('TYPE:')) {
        const type = trimmedLine.replace('TYPE:', '').trim() as ReviewComment['type'];
        currentComment.type = type;
      } else if (trimmedLine.startsWith('PRIORITY:')) {
        const priority = trimmedLine.replace('PRIORITY:', '').trim() as ReviewComment['priority'];
        currentComment.priority = priority;
      } else if (trimmedLine.startsWith('BODY:')) {
        currentComment.body = trimmedLine.replace('BODY:', '').trim();
      } else if (trimmedLine === '---') {
        if (currentComment.file) {
          this.addComment(comments, currentComment);
          currentComment = {};
        }
      } else if (trimmedLine && currentSection) {
        if (currentSection === 'summary' && !summary) {
          summary = trimmedLine;
        } else if (currentSection === 'recommendations' && trimmedLine.match(/^\d+\./)) {
          recommendations.push(trimmedLine.replace(/^\d+\.\s*/, ''));
        }
      }
    }

    // Add the last comment if exists
    if (currentComment.file) {
      this.addComment(comments, currentComment);
    }

    return {
      overallScore,
      summary: summary || 'コードレビューが完了しました。',
      recommendations,
      comments,
    };
  }

  private addComment(comments: ReviewComment[], commentData: Partial<ReviewComment>): void {
    if (commentData.file && commentData.body) {
      comments.push({
        file: commentData.file,
        line: commentData.line,
        body: commentData.body,
        type: commentData.type || 'suggestion',
        priority: commentData.priority || 'medium',
      });
    }
  }
}