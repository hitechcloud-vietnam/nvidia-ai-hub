# FireRed Image Edit 1.1 for NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC

Self-contained NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC recipe for `FireRedTeam/FireRed-Image-Edit-1.1`.

Install behavior:
- NVIDIA AI Hub by Pho Tue SoftWare Solutions JSC performs a local Docker build from this recipe directory.
- The running container downloads model weights on first launch into a persistent Hugging Face cache volume.
- Outputs are written to a persistent output volume.

Interface:
- Upload up to 3 input images
- Enter an edit prompt
- Optionally choose `Covercraft`, `Lightning`, or `Makeup` LoRA
- Adjust seed, steps, CFG, resolution, and output count

Upstream references:
- Model: https://huggingface.co/FireRedTeam/FireRed-Image-Edit-1.1
- Demo Space: https://huggingface.co/spaces/FireRedTeam/FireRed-Image-Edit-1.1
