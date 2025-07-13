# Gistストレージ改修 - TDDアプローチ

## 概要
t-wadaスタイルのTDD（RED → GREEN → REFACTOR → COMMIT）を使用して、Gistストレージ処理を抜本的に改修します。

## 設計方針
1. **リモートファースト**: マージ処理を廃止し、リモートを信頼できる唯一の情報源とする
2. **バージョン管理**: Gist APIのetagとcommit履歴を活用
3. **リポジトリパターン**: テスタブルな設計のためGistRepositoryインターフェースを導入
4. **lastModifiedの削除**: コンテンツからlastModifiedを削除し、GistのAPIレベルでバージョン管理

## TDDサイクル計画

### Phase 1: インターフェース設計とモック実装 (Cycle 1-7)

#### Cycle 1: GistRepository インターフェース定義
- **RED**: インターフェースを使用するテストを書く
- **GREEN**: 最小限のインターフェース定義
- **REFACTOR**: 型定義の整理
- **COMMIT**: "feat: Define GistRepository interface"

#### Cycle 2: MockGistRepository 基本実装
- **RED**: create操作のテストを書く
- **GREEN**: メモリ内でのcreate実装
- **REFACTOR**: エラーハンドリングの追加
- **COMMIT**: "feat: Implement MockGistRepository create operation"

#### Cycle 3: read操作の実装
- **RED**: read操作のテストを書く（存在する/しないケース）
- **GREEN**: read実装とエラーケース処理
- **REFACTOR**: 共通処理の抽出
- **COMMIT**: "feat: Add read operation to MockGistRepository"

#### Cycle 4: update操作とetag検証
- **RED**: update操作とetag不一致のテストを書く
- **GREEN**: etag検証付きupdate実装
- **REFACTOR**: etag生成ロジックの整理
- **COMMIT**: "feat: Implement update with etag validation"

#### Cycle 5: exists操作の実装
- **RED**: exists操作のテストを書く
- **GREEN**: exists実装
- **REFACTOR**: 内部ストレージアクセスの最適化
- **COMMIT**: "feat: Add exists operation to MockGistRepository"

#### Cycle 6: findByFilename操作の実装
- **RED**: findByFilename操作のテストを書く
- **GREEN**: ファイル名検索の実装
- **REFACTOR**: 検索ロジックの最適化
- **COMMIT**: "feat: Implement findByFilename operation"

#### Cycle 7: getCommits操作の実装
- **RED**: コミット履歴取得のテストを書く
- **GREEN**: モックコミット履歴の実装
- **REFACTOR**: コミットデータ構造の整理
- **COMMIT**: "feat: Add getCommits to MockGistRepository"

### Phase 2: 実装とGist API統合 (Cycle 8-13)

#### Cycle 8: FetchGistRepository 基本構造
- **RED**: 実際のGist APIを使用するテストを書く（モック化）
- **GREEN**: FetchGistRepositoryの骨組み実装
- **REFACTOR**: HTTP通信の抽象化
- **COMMIT**: "feat: Create FetchGistRepository structure"

#### Cycle 9: create操作のAPI実装
- **RED**: Gist作成APIのテストを書く
- **GREEN**: fetch APIを使用したcreate実装
- **REFACTOR**: エラーレスポンス処理の統一
- **COMMIT**: "feat: Implement Gist create with fetch API"

#### Cycle 10: read/update操作のAPI実装
- **RED**: read/updateのAPIテストを書く
- **GREEN**: etag付きread/update実装
- **REFACTOR**: HTTPヘッダー処理の共通化
- **COMMIT**: "feat: Add read/update operations with etag support"

#### Cycle 11: 検索操作のAPI実装
- **RED**: exists/findByFilenameのAPIテストを書く
- **GREEN**: Gist検索API実装
- **REFACTOR**: ページネーション処理の追加
- **COMMIT**: "feat: Implement Gist search operations"

#### Cycle 12: コミット履歴のAPI実装
- **RED**: getCommitsのAPIテストを書く
- **GREEN**: Gist commits API実装
- **REFACTOR**: レスポンスマッピングの整理
- **COMMIT**: "feat: Add commit history retrieval"

#### Cycle 13: lastModifiedの削除
- **RED**: lastModified無しでのテストを書く
- **GREEN**: Rootからmetadata.lastModifiedを削除
- **REFACTOR**: 関連する処理の削除
- **COMMIT**: "refactor: Remove lastModified from content"

### Phase 3: SyncShell改修 (Cycle 14-17)

#### Cycle 14: GistRepositoryへの移行
- **RED**: GistRepository使用のテストを書く
- **GREEN**: SyncShellをGistRepository使用に変更
- **REFACTOR**: 依存性注入の改善
- **COMMIT**: "refactor: Migrate SyncShell to use GistRepository"

#### Cycle 15: マージ処理の削除
- **RED**: リモートファーストのテストを書く
- **GREEN**: mergeRoots呼び出しを削除
- **REFACTOR**: 不要なマージ関連コードの削除
- **COMMIT**: "refactor: Remove merge processing"

#### Cycle 16: 競合処理の簡素化
- **RED**: 新しい競合処理のテストを書く
- **GREEN**: etagベースの競合検出実装
- **REFACTOR**: エラーメッセージの改善
- **COMMIT**: "feat: Implement etag-based conflict detection"

#### Cycle 17: トランザクション操作の更新
- **RED**: syncBeforeOperation/saveAfterOperationのテストを書く
- **GREEN**: 新しいリモートファースト実装
- **REFACTOR**: エラーリカバリーの追加
- **COMMIT**: "refactor: Update transactional operations"

### Phase 4: UI統合 (Cycle 18-20)

#### Cycle 18: 競合通知UI
- **RED**: 競合通知コンポーネントのテストを書く
- **GREEN**: ConflictAlert実装
- **REFACTOR**: スタイリングとアクセシビリティ
- **COMMIT**: "feat: Add conflict alert UI component"

#### Cycle 19: 同期ステータス表示
- **RED**: 同期ステータスのテストを書く
- **GREEN**: SyncStatus実装
- **REFACTOR**: アニメーションの追加
- **COMMIT**: "feat: Implement sync status indicator"

#### Cycle 20: 統合テスト
- **RED**: E2Eテストを書く
- **GREEN**: 全機能の動作確認
- **REFACTOR**: パフォーマンス最適化
- **COMMIT**: "test: Add comprehensive E2E tests"

## 各サイクルの詳細実装手順

### Cycle 1の例:
```bash
# RED: テストを書く
npm test -- --watch gist-repository.test.ts

# テストが失敗することを確認

# GREEN: 最小限の実装
# インターフェースを定義してテストをパス

# REFACTOR: 型定義の整理
# 不要な型を削除、命名の改善

# COMMIT
git add -A && git commit -m "feat: Define GistRepository interface"
```

## テストファイル構成
```
test/
├── unit/
│   ├── gist-repository.test.ts
│   ├── mock-gist-repository.test.ts
│   └── fetch-gist-repository.test.ts
├── integration/
│   ├── sync-shell-gist.test.ts
│   └── bookmark-service-sync.test.ts
└── e2e/
    └── gist-sync-flow.spec.ts
```

## 注意事項
1. 各サイクルで必ずテストを先に書く
2. テストが失敗することを確認してから実装
3. 最小限の実装でテストをパスさせる
4. リファクタリング後もテストがパスすることを確認
5. 各サイクルごとにコミット

## 現在のステータス
- [x] Phase 1: インターフェース設計とモック実装
  - [x] Cycle 1: GistRepository インターフェース定義
  - [x] Cycle 2: MockGistRepository 基本実装 (create操作)
  - [x] Cycle 3: read操作の実装
  - [x] Cycle 4: update操作とetag検証
  - [x] Cycle 5: exists操作の実装
  - [x] Cycle 6: findByFilename操作の実装
  - [x] Cycle 7: getCommits操作の実装
- [ ] Phase 2: 実装とGist API統合
  - [ ] Cycle 8: FetchGistRepository 基本構造
  - [ ] Cycle 9: create操作のAPI実装
  - [ ] Cycle 10: read/update操作のAPI実装
  - [ ] Cycle 11: 検索操作のAPI実装
  - [ ] Cycle 12: コミット履歴のAPI実装
  - [ ] Cycle 13: lastModifiedの削除
- [ ] Phase 3: SyncShell改修
- [ ] Phase 4: UI統合