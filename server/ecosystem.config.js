module.exports = {
  apps: [{
    name: "bug-platform-backend",
    script: "app.js",
    cwd: __dirname, // 确保在 server 目录启动，这样 dotenv 会加载 server/.env
    instances: 1,
    exec_mode: "cluster",
    env: {
      NODE_ENV: "development",
      PORT: 3000,
      NODE_OPTIONS: "--dns-result-order=ipv4first"
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3000,
      MONGODB_URI: "mongodb://127.0.0.1:27017/bug_knowledge_platform",
  NODE_OPTIONS: "--dns-result-order=ipv4first",
  FRONTEND_URLS: "http://8.155.160.151,https://8.155.160.151"
    },
    error_file: "/var/log/bug-platform/error.log",
    out_file: "/var/log/bug-platform/out.log",
    log_file: "/var/log/bug-platform/combined.log",
    time: true,
    max_memory_restart: "500M",
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: "10s"
  }]
};
