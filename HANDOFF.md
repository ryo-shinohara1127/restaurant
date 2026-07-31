# 引き継ぎメモ (2026-07-31時点)

新しい会話でこのプロジェクトの続きをやるときは、このファイルとREADME.mdを読んでから始めてください。

## 今の状態
- 本番URL: https://restaurant-12t4.onrender.com (Render無料プラン、GitHub `ryo-shinohara1127/restaurant` の `main` push で自動デプロイ)
- 検索 → 行きたい店(お気に入り) → 共有ボックス(相手ごとに複数) → 共有リンク発行、まで一通り本番で動作確認済み
- 検索は毎回、ホットペッパー/食べログ/Googleそれぞれに「使わない/1〜3番目」を選べる(選ばなかったソースは結果から除外される。単なる並び替えではなく除外もできる仕様)
- 各カードに「Instagramで見る/TikTokで見る」の検索リンクあり(SNS内の実データ取得は公開APIが無いため不可能。リンクを開くだけ)
- 共有リンクはTinyURLで自動短縮(失敗時は元の長いURLにフォールバック)

## 未解決の課題
**食べログが実際には機能していない**: `src/services/tabelogViaGoogle.js` は実装済みで`search.js`にも組み込み済みだが、Google Custom Search APIが常に`403 This project does not have the access to Custom Search JSON API`を返す。Billing有効・API有効(有効/無効の再トグルも試した)・新規キー・新規検索エンジン(cx)、全て確認済みで原因不明。Google側の反映待ちの可能性があるとして保留中。失敗時はエラーを握りつぶして結果から除外するだけなので、アプリ自体は壊れない。

**再検証コマンド**(新しい会話で再テストする場合):
```bash
curl -s "https://www.googleapis.com/customsearch/v1?key=AIzaSyBf4b_BOqnp2Le3UM3xXsBldboUuO3iQa8&cx=247cd92814898473e&q=test"
```
成功すれば `{"kind":"customsearch#search",...}` のようなJSON、失敗すれば同じ403エラーが返る。

## Google Cloudの状態
- プロジェクト: "My Project 15315" (`nomadic-genre-503712-q8`)。同一アカウントに無関係な"My First Project"も存在するので混同注意
- 無料トライアル中(¥48,488クレジット、期限2026-10-27)。トライアル中は自動課金されないが、Custom Search APIのクォータ手動編集はトライアル中ブロックされる仕様と判明
- ユーザー側でカレンダーリマインダーを2026-10-20に設定済み(トライアル終了前に本アカウント化するか判断するため)

## ファイル構成の要点
- `server.js` — Express本体、`/api/*`ルート登録
- `src/routes/search.js` — メイン検索ロジック(Google Places起点→各ソースクロスチェック→優先順位/除外)
- `src/services/googlePlaces.js` / `hotpepper.js` / `tabelogViaGoogle.js` / `urlShortener.js` — 各外部API連携
- `public/app.js` — フロント全体(検索フォーム、行きたい店、共有ボックス、共有リンク生成)
- `public/share.html` / `share.js` — 共有リンク先のread-onlyページ(URLハッシュにデータを直接埋め込み、サーバー保存なし)
- `.env` にAPIキー(ローカル用、gitには含まれない)。本番の環境変数はRenderダッシュボードの「Environment」タブで設定

## 次にやるとしたら
1. 食べログのCustom Search APIエラーの再検証(上記コマンド)
2. Google Cloudのクォータ上限設定(トライアル終了が近づいたら)
3. ユーザーからのその他の要望次第
