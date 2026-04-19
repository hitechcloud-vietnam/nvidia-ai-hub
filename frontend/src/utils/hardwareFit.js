import i18n from '../i18n'

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

function toGbFromMb(value) {
  const numeric = Number(value || 0)
  if (numeric <= 0) return 0
  return Math.round((numeric / 1024) * 10) / 10
}

function getHostGpuMemoryGb(metrics) {
  const gpuList = Array.isArray(metrics?.gpus) ? metrics.gpus : []
  const maxPerGpuMb = gpuList.reduce((maxValue, gpu) => {
    const totalMb = Number(gpu?.memory_total_mb || 0)
    return totalMb > maxValue ? totalMb : maxValue
  }, 0)

  if (maxPerGpuMb > 0) {
    return toGbFromMb(maxPerGpuMb)
  }

  return toGbFromMb(metrics?.gpu_memory_total_mb || 0)
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
      label: i18n.t('hardwareFit.labels.unknown'),
      tone: 'dim',
      headline: i18n.t('hardwareFit.headlines.recipeMetadataUnavailable'),
      checks: [],
    }
  }

  if (!metrics) {
    return {
      status: 'unknown',
      label: i18n.t('hardwareFit.labels.checking'),
      tone: 'dim',
      headline: i18n.t('hardwareFit.headlines.waitingForTelemetry'),
      checks: [],
    }
  }

  const requirements = recipe.requirements || {}
  const checks = []
  const needsGpu = recipe?.docker?.gpu !== false

  const minRam = Number(requirements.min_memory_gb || 0)
  const recommendedRam = Number(requirements.recommended_memory_gb || 0)
  const hostMemory = needsGpu ? getHostGpuMemoryGb(metrics) : Number(metrics.ram_total_gb || 0)
  const memoryLabel = needsGpu ? i18n.t('hardwareFit.checkLabels.gpuMemory') : i18n.t('hardwareFit.checkLabels.systemRam')
  const messagePrefix = needsGpu ? 'gpuRam' : 'ram'
  if (hostMemory > 0 && minRam > 0) {
    if (hostMemory < minRam) {
      checks.push(createCheck('ram', memoryLabel, 'critical', i18n.t(`hardwareFit.messages.${messagePrefix}Critical`, { minRam, hostRam: hostMemory })))
    } else if (recommendedRam > hostMemory) {
      checks.push(createCheck('ram', memoryLabel, 'warning', i18n.t(`hardwareFit.messages.${messagePrefix}Warning`, { minRam, recommendedRam, hostRam: hostMemory })))
    } else {
      checks.push(createCheck('ram', memoryLabel, 'good', i18n.t(`hardwareFit.messages.${messagePrefix}Good`, { hostRam: hostMemory })))
    }
  }

  const requiredDisk = Number(requirements.disk_gb || 0)
  const freeDisk = Number(metrics.disk_free_gb || 0)
  if (freeDisk > 0 && requiredDisk > 0) {
    if (freeDisk < requiredDisk) {
      checks.push(createCheck('disk', i18n.t('hardwareFit.checkLabels.freeDisk'), 'critical', i18n.t('hardwareFit.messages.diskCritical', { requiredDisk, freeDisk })))
    } else {
      checks.push(createCheck('disk', i18n.t('hardwareFit.checkLabels.freeDisk'), 'good', i18n.t('hardwareFit.messages.diskGood', { freeDisk, requiredDisk })))
    }
  }

  if (needsGpu) {
    if ((metrics.gpu_count || 0) < 1) {
      checks.push(createCheck('gpu', i18n.t('hardwareFit.checkLabels.gpuAvailability'), 'critical', i18n.t('hardwareFit.messages.gpuCritical')))
    } else {
      checks.push(createCheck('gpu', i18n.t('hardwareFit.checkLabels.gpuAvailability'), 'good', i18n.t('hardwareFit.messages.gpuGood', { gpu: metrics.gpu_name || i18n.t('hardwareFit.messages.gpuCountLabel', { count: metrics.gpu_count }) })))
    }

    const requiredCompute = requirements.cuda_compute
    const hostCompute = metrics.gpu_compute_capability
    if (requiredCompute && hostCompute) {
      if (compareVersions(hostCompute, requiredCompute) < 0) {
        checks.push(createCheck('compute', i18n.t('hardwareFit.checkLabels.computeCapability'), 'critical', i18n.t('hardwareFit.messages.computeCritical', { requiredCompute, hostCompute })))
      } else {
        checks.push(createCheck('compute', i18n.t('hardwareFit.checkLabels.computeCapability'), 'good', i18n.t('hardwareFit.messages.computeGood', { hostCompute, requiredCompute })))
      }
    } else if (requiredCompute) {
      checks.push(createCheck('compute', i18n.t('hardwareFit.checkLabels.computeCapability'), 'unknown', i18n.t('hardwareFit.messages.computeUnknown', { requiredCompute })))
    }
  } else {
    checks.push(createCheck('gpu', i18n.t('hardwareFit.checkLabels.gpuRequirement'), 'good', i18n.t('hardwareFit.messages.gpuNotRequired')))
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
    good: i18n.t('hardwareFit.labels.ready'),
    warning: i18n.t('hardwareFit.labels.review'),
    critical: i18n.t('hardwareFit.labels.notFit'),
    unknown: i18n.t('hardwareFit.labels.checking'),
  }

  const primaryIssue = checks.find((check) => check.status === 'critical')
    || checks.find((check) => check.status === 'warning')
    || checks.find((check) => check.status === 'unknown')
    || checks[0]

  return {
    status,
    label: labelMap[status],
    tone: getStatusTone(status),
    headline: primaryIssue?.message || i18n.t('hardwareFit.headlines.completed'),
    checks,
  }
}