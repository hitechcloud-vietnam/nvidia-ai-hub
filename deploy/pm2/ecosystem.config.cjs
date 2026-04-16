module.exports = {
  apps: [
    {
      name: 'nvidia-ai-hub',
      script: '.venv/bin/python',
      args: '-m uvicorn daemon.main:app --host 127.0.0.1 --port 9000',
      cwd: '/home/ubuntu/nvidia-ai-hub',
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
