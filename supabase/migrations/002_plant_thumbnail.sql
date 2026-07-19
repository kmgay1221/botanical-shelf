-- 一覧表示(棚/ホーム)用の軽量サムネイル(200px程度)を別途配信するための列。
-- 未設定(null)の株は引き続き photo_url を Next/Image でリサイズ表示する。
alter table plants add column photo_thumb_url text;
