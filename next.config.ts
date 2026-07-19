import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 動的ページ(force-dynamic)もクライアント側Router Cacheの対象にし、
  // 短時間の再訪(タブ切替等)ではサーバーへ再取得せず即時表示する。
  // ミューテーション直後はrouter.refresh()で該当ルートのキャッシュを明示的に更新する
  experimental: {
    staleTimes: {
      dynamic: 20,
    },
  },
  // Service Worker が / から読み込めるように
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },
  // Supabase Storage の画像を許可
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
