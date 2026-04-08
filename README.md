# InspirationCat

動物の写真から「閃いた！」風の画像を作れるWebアプリ。

背景除去からエフェクト合成まで、すべてブラウザ内で完結。サーバーへの画像送信は一切ありません。

作った画像をシェアするときは **#InspirationCat** をつけてもらえると嬉しいです！

**https://inspiration-cat.pages.dev**

![サンプル](public/sample.png)

## 機能

- 写真アップロード → AI背景除去 → 閃きエフェクト合成
- ドラッグで位置調整 / スライダーでサイズ・回転を変更
- 画像保存・シェア・Xへのポスト
- モバイル対応（タッチ操作・Web Share API）

## 技術スタック

- [Vite](https://github.com/vitejs/vite) + TypeScript
- [@imgly/background-removal](https://github.com/imgly/background-removal-js) — ブラウザ上でのAI背景除去
- Cloudflare Pages でホスティング

## 開発

```bash
pnpm install
pnpm dev
```

## ビルド

```bash
pnpm build
```

## ライセンス

本プロジェクトは [@imgly/background-removal](https://github.com/imgly/background-removal-js) (AGPL-3.0) を使用しているため、ソースコードを公開しています。

詳細は各依存パッケージのライセンスを参照してください。
