module.exports = {
  apps: [
    {
      name: "wanbit",
      script: "index.js",
      interpreter: "node",
      exec_mode: "fork", // avoid cluster mode with Baileys
      instances: 1,
      watch: false, // Baileys writes to auth files frequently; watching causes restart loops
      env: {
        NODE_ENV: "production",
      },
      // If you really need watch, keep it scoped and ignore auth/logs
      watch_options: {
        awaitWriteFinish: true,
        usePolling: false,
        ignoreInitial: true,
        ignored: [
          "assets/auth/**",
          "assets/logs/**",
          "node_modules/**",
          ".git/**",
          "prisma/client/**",
        ],
      },
    },
  ],
};
