// Configuración de pm2 para el VPS.
// Uso: pm2 start ecosystem.config.cjs && pm2 save
// El puerto interno es 3013 (nginx lo expone en 80/443 con el dominio);
// los puertos < 1024 (como el 13) requieren root y no se usan para apps.
module.exports = {
  apps: [
    {
      name: "valentinvarela",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3013",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      time: true,
    },
  ],
};
