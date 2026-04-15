import argparse
import datetime
import os
import sys
import warnings

import gradio as gr

warnings.filterwarnings("ignore")
sys.path.insert(0, "/opt/Wan2.1")

import wan  # noqa: E402
from wan.configs import WAN_CONFIGS  # noqa: E402
from wan.utils.utils import cache_video  # noqa: E402

wan_t2v = None


def generate_video(prompt, resolution, sd_steps, guide_scale, shift_scale, seed, n_prompt):
    width, height = [int(part) for part in resolution.split("*")]
    video = wan_t2v.generate(
        prompt,
        size=(width, height),
        shift=shift_scale,
        sampling_steps=sd_steps,
        guide_scale=guide_scale,
        n_prompt=n_prompt,
        seed=seed,
        offload_model=True,
    )

    output_dir = "/opt/Wan2.1/outputs"
    os.makedirs(output_dir, exist_ok=True)
    filename = datetime.datetime.now().strftime("wan-%Y%m%d-%H%M%S.mp4")
    output_path = os.path.join(output_dir, filename)
    cache_video(
        tensor=video[None],
        save_file=output_path,
        fps=16,
        nrow=1,
        normalize=True,
        value_range=(-1, 1),
    )
    return output_path


def build_demo():
    with gr.Blocks() as demo:
        gr.Markdown(
            """
            <div style='text-align:center; font-size:32px; font-weight:bold; margin-bottom:20px;'>Wan 2.1 Text-to-Video</div>
            <div style='text-align:center; font-size:16px; margin-bottom:20px;'>Official Wan 2.1 text-to-video workflow with persistent local checkpoints.</div>
            """
        )
        with gr.Row():
            with gr.Column():
                prompt = gr.Textbox(label="Prompt", placeholder="Describe the video you want to generate")
                with gr.Accordion("Advanced Options", open=True):
                    resolution = gr.Dropdown(
                        label="Resolution (Width*Height)",
                        choices=[
                            "720*1280",
                            "1280*720",
                            "960*960",
                            "1088*832",
                            "832*1088",
                            "480*832",
                            "832*480",
                            "624*624",
                            "704*544",
                            "544*704",
                        ],
                        value="720*1280",
                    )
                    sd_steps = gr.Slider(label="Diffusion steps", minimum=1, maximum=100, value=50, step=1)
                    guide_scale = gr.Slider(label="Guide scale", minimum=0, maximum=20, value=5.0, step=0.5)
                    shift_scale = gr.Slider(label="Shift scale", minimum=0, maximum=10, value=5.0, step=0.5)
                    seed = gr.Slider(label="Seed", minimum=-1, maximum=2147483647, value=-1, step=1)
                    n_prompt = gr.Textbox(label="Negative Prompt", placeholder="Optional negative prompt")
                run_button = gr.Button("Generate Video")
            with gr.Column():
                output = gr.Video(label="Generated Video", interactive=False, height=600)

        run_button.click(
            fn=generate_video,
            inputs=[prompt, resolution, sd_steps, guide_scale, shift_scale, seed, n_prompt],
            outputs=[output],
        )

    return demo


def main():
    parser = argparse.ArgumentParser(description="Wan 2.1 Gradio launcher")
    parser.add_argument("--ckpt_dir", required=True, help="Path to the Wan checkpoint directory")
    parser.add_argument("--model_name", default="t2v-14B", help="Wan config key to load")
    parser.add_argument("--server-name", default="0.0.0.0", help="Server host")
    parser.add_argument("--port", type=int, default=7860, help="Server port")
    args = parser.parse_args()

    global wan_t2v
    wan_t2v = wan.WanT2V(
        config=WAN_CONFIGS[args.model_name],
        checkpoint_dir=args.ckpt_dir,
        device_id=0,
        rank=0,
        t5_fsdp=False,
        dit_fsdp=False,
        use_usp=False,
    )

    demo = build_demo()
    demo.launch(server_name=args.server_name, server_port=args.port, allowed_paths=["/opt/Wan2.1/outputs"])


if __name__ == "__main__":
    main()
