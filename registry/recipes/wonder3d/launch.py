import os
import sys

import gradio as gr

sys.path.insert(0, "/opt/Wonder3D")
os.chdir("/opt/Wonder3D")

server_name = os.getenv("GRADIO_SERVER_NAME", "0.0.0.0")
server_port = int(os.getenv("GRADIO_SERVER_PORT", "7860"))
output_dir = "/opt/Wonder3D/outputs"
os.makedirs(output_dir, exist_ok=True)

_original_launch = gr.Blocks.launch


def _patched_launch(self, *args, **kwargs):
    kwargs["server_name"] = server_name
    kwargs["server_port"] = server_port
    kwargs["share"] = False
    kwargs.setdefault("allowed_paths", [output_dir])
    return _original_launch(self, *args, **kwargs)


gr.Blocks.launch = _patched_launch

import gradio_app_mv  # noqa: E402


gradio_app_mv.run_demo()
