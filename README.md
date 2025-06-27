# 🤖 AI Code Reviewer

Claude API を使用した自動コードレビューボット。GitHub のプルリクエストを自動的に解析し、AIによる詳細なコードレビューを提供します。

## ✨ 機能

- **🔍 自動コード解析**: プルリクエストの変更を自動検出・解析
- **🧠 AI レビュー**: Claude API による高品質なコードレビュー
- **📊 スコアリング**: コード品質の総合評価（0-100点）
- **🏷️ 自動ラベル付け**: レビュー結果に基づくPRラベル自動追加
- **🔒 セキュリティチェック**: 潜在的な脆弱性の検出
- **⚡ パフォーマンス分析**: 効率性とベストプラクティスの確認

## 🚀 セットアップ

### 1. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 2. 環境変数の設定

\`.env\` ファイルを作成し、以下の設定を行ってください：

\`\`\`env
# Server Configuration
PORT=3000

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key
\`\`\`

### 3. GitHub Webhook の設定

1. GitHubリポジトリの Settings → Webhooks に移動
2. "Add webhook" をクリック
3. 以下のように設定：
   - **Payload URL**: \`https://your-domain.com/webhook/github\`
   - **Content type**: \`application/json\`
   - **Secret**: 環境変数の \`GITHUB_WEBHOOK_SECRET\` と同じ値
   - **Events**: "Pull requests" を選択

### 4. GitHub Personal Access Token の作成

1. GitHub Settings → Developer settings → Personal access tokens
2. "Generate new token" をクリック
3. 必要な権限を選択：
   - \`repo\` (フルアクセス)
   - \`write:discussion\` (プルリクエストコメント用)

### 5. Anthropic API キーの取得

1. [Anthropic Console](https://console.anthropic.com) にアクセス
2. API キーを生成

## 🛠️ 使用方法

### 開発モード

\`\`\`bash
npm run dev
\`\`\`

### 本番ビルド

\`\`\`bash
npm run build
npm start
\`\`\`

## 📋 API エンドポイント

- \`GET /health\` - ヘルスチェック
- \`POST /webhook/github\` - GitHub Webhook受信

## 🔧 技術スタック

- **Backend**: Node.js + TypeScript + Express
- **AI**: Anthropic Claude API
- **GitHub**: Octokit REST API
- **Security**: Webhook署名検証

## 📈 レビュー項目

AIは以下の観点からコードをレビューします：

1. **🔒 セキュリティ**
   - 機密情報の漏洩チェック
   - 潜在的な脆弱性の検出

2. **⚡ パフォーマンス**
   - アルゴリズムの効率性
   - メモリ使用量の最適化

3. **📖 可読性**
   - コードの明確さ
   - 命名規則の遵守

4. **🔧 保守性**
   - モジュール化の適切さ
   - テスタビリティ

5. **✅ ベストプラクティス**
   - 言語固有の慣習
   - 設計パターンの適用

## 📊 スコアリング

- **90-100点**: 🎉 優秀 (Excellent)
- **80-89点**: ✅ 良好 (Good)
- **70-79点**: 👍 改善必要 (Needs Improvement)
- **60-69点**: ⚠️ レビュー必要 (Review Required)
- **0-59点**: 🚨 要作業 (Needs Work)

## 🚀 デプロイ

### Vercel

\`\`\`bash
npm install -g vercel
vercel
\`\`\`

### Railway

\`\`\`bash
npm install -g @railway/cli
railway login
railway deploy
\`\`\`

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (\`git checkout -b feature/amazing-feature\`)
3. 変更をコミット (\`git commit -m 'Add amazing feature'\`)
4. ブランチにプッシュ (\`git push origin feature/amazing-feature\`)
5. プルリクエストを作成

## 📄 ライセンス

MIT License

## 🆘 サポート

問題が発生した場合は、GitHub Issues でお知らせください。