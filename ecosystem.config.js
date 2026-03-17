module.exports = {
  apps: [
    {
      name: "nestjs-api",
      script: "dist/main.js",
      cwd: "/var/www/grapper_backend",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        API_URL: "https://api.grapper.net",
      },
      env_production: {
        NODE_ENV: "production",
        API_URL: "https://api.grapper.net",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
  ],
};
