import os
import sys
from pathlib import Path

ROOT = Path("/opt/cogvideo/inference/gradio_composite_demo")
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))

import app  # noqa: E402

queue_size = int(os.environ.get("COGVIDEO_QUEUE_SIZE", "15"))
server_name = os.environ.get("GRADIO_SERVER_NAME", "0.0.0.0")
server_port = int(os.environ.get("GRADIO_SERVER_PORT", "7860"))

app.demo.queue(max_size=queue_size)
app.demo.launch(server_name=server_name, server_port=server_port)
