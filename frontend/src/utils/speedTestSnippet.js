function normalizeApiUrl(apiUrl, host) {
  const resolved = String(apiUrl || '')
    .replace(/<NVIDIA_AI_HUB_IP>/g, host)
    .replace(/<SPARK_IP>/g, host)
    .trim()
    .replace(/\/+$/, '')

  if (!resolved) return ''
  return resolved.endsWith('/chat/completions') ? resolved : `${resolved}/chat/completions`
}

function pythonLiteral(value) {
  return JSON.stringify(String(value || ''))
}

export function buildLlmSpeedTestSnippet(integration, host = location.hostname) {
  const endpoint = normalizeApiUrl(integration?.api_url, host)
  const modelId = String(integration?.model_id || '').trim()
  if (!endpoint || !modelId) return ''

  return [
    'python3 - <<\'PY\'',
    'import json',
    'import time',
    'import urllib.request',
    '',
    `url = ${pythonLiteral(endpoint)}`,
    `model = ${pythonLiteral(modelId)}`,
    'payload = {',
    '    "model": model,',
    '    "messages": [{"role": "user", "content": "Write a quicksort in Python."}],',
    '    "max_tokens": 512,',
    '    "temperature": 0,',
    '    "stream": False,',
    '}',
    'data = json.dumps(payload).encode("utf-8")',
    'request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})',
    'start = time.perf_counter()',
    'with urllib.request.urlopen(request, timeout=300) as response:',
    '    result = json.loads(response.read().decode("utf-8"))',
    'elapsed = time.perf_counter() - start',
    'usage = result.get("usage") or {}',
    'tokens = usage.get("completion_tokens") or usage.get("output_tokens") or 0',
    'if not tokens:',
    '    content = ""',
    '    choices = result.get("choices") or []',
    '    if choices:',
    '        message = choices[0].get("message") or {}',
    '        content = message.get("content") or choices[0].get("text") or ""',
    '    tokens = len(str(content).split())',
    'speed = tokens / elapsed if elapsed > 0 else 0',
    'print(f"--- {tokens} tokens in {elapsed:.2f}s = {speed:.1f} tok/s ---")',
    'PY',
  ].join('\n')
}