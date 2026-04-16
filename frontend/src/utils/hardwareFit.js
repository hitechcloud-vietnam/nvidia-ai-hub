function parseVersion(value) {
  const parts = String(value || '').match(/\d+/g)
  if (!parts) return []
  return parts.map((part) => Number.parseInt(part, 10))
}

function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  const length = Math.max(a.length, b.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = a[index] ?? 0
    const rightPart = b[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }

  return 0
}

function createCheck(id, label, status, message) {
  return { id, label, status, message }
}

function getStatusTone(status) {
  if (status === 'critical') return 'error'
  if (status === 'warning') return 'warning'
  if (status === 'good') return 'success'
  return 'dim'
}

export function getRecipeHardwareFit(recipe, metrics) {
  if (!recipe) {
    return {
      status: 'unknown',
      label: 'Unknown',
      tone: 'dim',
      headline: 'Recipe metadata unavailable.',
      checks: [],
    }
  }

  if (!metrics) {
    return {
      status: 'unknown',
      label: 'Checking',
      tone: 'dim',
      headline: 'Waiting for live host telemetry before evaluating hardware fit.',
      checks: [],
    }
  }

  const requirements = recipe.requirements || {}
  const checks = []
  const needsGpu = recipe?.docker?.gpu !== false

  const minRam = Number(requirements.min_memory_gb || 0)
  const recommendedRam = Number(requirements.recommended_memory_gb || 0)
  const hostRam = Number(metrics.ram_total_gb || 0)
  if (hostRam > 0 && minRam > 0) {
    if (hostRam < minRam) {
      checks.push(createCheck('ram', 'System RAM', 'critical', `Needs at least ${minRam} GB RAM; host reports ${hostRam} GB.`))
    } else if (recommendedRam > hostRam) {
      checks.push(createCheck('ram', 'System RAM', 'warning', `Meets the ${minRam} GB minimum, but is below the recommended ${recommendedRam} GB.`))
    } else {
      checks.push(createCheck('ram', 'System RAM', 'good', `Host RAM (${hostRam} GB) meets the recipe target.`))
    }
  }

  const requiredDisk = Number(requirements.disk_gb || 0)
  const freeDisk = Number(metrics.disk_free_gb || 0)
  if (freeDisk > 0 && requiredDisk > 0) {
    if (freeDisk < requiredDisk) {
      checks.push(createCheck('disk', 'Free disk', 'critical', `Needs about ${requiredDisk} GB free disk; host reports ${freeDisk} GB free.`))
    } else {
      checks.push(createCheck('disk', 'Free disk', 'good', `Host has ${freeDisk} GB free disk for an estimated ${requiredDisk} GB footprint.`))
    }
  }

  if (needsGpu) {
    if ((metrics.gpu_count || 0) < 1) {
      checks.push(createCheck('gpu', 'GPU availability', 'critical', 'Recipe expects an NVIDIA-capable GPU host, but no GPU telemetry is currently available.'))
    } else {
      checks.push(createCheck('gpu', 'GPU availability', 'good', `${metrics.gpu_name || `${metrics.gpu_count} GPU`} detected for GPU-backed launch.`))
    }

    const requiredCompute = requirements.cuda_compute
    const hostCompute = metrics.gpu_compute_capability
    if (requiredCompute && hostCompute) {
      if (compareVersions(hostCompute, requiredCompute) < 0) {
        checks.push(createCheck('compute', 'Compute capability', 'critical', `Requires compute capability ${requiredCompute}+; host reports ${hostCompute}.`))
      } else {
        checks.push(createCheck('compute', 'Compute capability', 'good', `Host compute capability ${hostCompute} satisfies the ${requiredCompute}+ target.`))
      }
    } else if (requiredCompute) {
      checks.push(createCheck('compute', 'Compute capability', 'unknown', `Recipe targets compute capability ${requiredCompute}+, but the host did not report compute capability telemetry.`))
    }
  } else {
    checks.push(createCheck('gpu', 'GPU requirement', 'good', 'This recipe can run without a GPU.'))
  }

  let status = 'good'
  if (checks.some((check) => check.status === 'critical')) {
    status = 'critical'
  } else if (checks.some((check) => check.status === 'warning')) {
    status = 'warning'
  } else if (checks.every((check) => check.status === 'unknown')) {
    status = 'unknown'
  }

  const labelMap = {
    good: 'Ready',
    warning: 'Review',
    critical: 'Not fit',
    unknown: 'Checking',
  }

  const primaryIssue = checks.find((check) => check.status === 'critical')
    || checks.find((check) => check.status === 'warning')
    || checks.find((check) => check.status === 'unknown')
    || checks[0]

  return {
    status,
    label: labelMap[status],
    tone: getStatusTone(status),
    headline: primaryIssue?.message || 'Hardware fit check completed.',
    checks,
  }
}