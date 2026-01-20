# Base64 → Float32 配列 変換ツール

テクストエリアに入力された Base64 文字列をバイト列に変換し、Float32 配列として各要素を表示するシンプルな Web ページです。

- Data URL (例: `data:application/octet-stream;base64,...`) にも対応
- URL セーフな Base64 (`-`/`_`) を通常の Base64 に自動変換
- Little/Big エンディアン切替
- 4 の倍数でないバイト長は末尾を無視して警告表示

## 使い方

1. VS Code で `tools/copilot-generated/base64tofloat32/index.html` をブラウザで開く
2. Base64 を貼り付け (必要ならエンディアンを調整)
3. 「変換」を押して結果を確認

初期状態でサンプルが挿入されているため、そのまま「変換」で動作確認できます。

## 構成

- `index.html`: UI と説明
- `main.js`: デコード/変換/表示のロジック

入力はローカルで処理され、外部に送信されません。
