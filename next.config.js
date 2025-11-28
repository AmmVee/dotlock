/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org https://cdn.jsdelivr.net",
              "connect-src 'self' https://cspryiqfeaftrzaxpwpk.supabase.co https://*.supabase.co wss://*.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "frame-src 'self' https://t.me",
              "worker-src 'self' blob:"
            ].join("; ")
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
