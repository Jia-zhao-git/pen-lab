// grafana 日志解析 + 降采样（纯函数，Node 可测）。
//
// grafana.sh 日志格式：时间戳|字段名|值|字段名|值|...
// 例：20261105 10:51:05|MemAvailable|133592|MemFree|39868|...
//     20261105 10:51:05|cpu_temp|0.00|battery_temp|3.20

// 解析一行日志 → { time, fields: {字段名: 数值} }
// time 用原始字符串（日期+时间），字段值转成数字
export function parseLine(line) {
  const s = String(line || '').trim()
  if (!s) return null
  const parts = s.split('|')
  if (parts.length < 3) return null
  const time = parts[0]
  const fields = {}
  // 从第 1 个起，两两一组：字段名, 值
  for (let i = 1; i + 1 < parts.length; i += 2) {
    const key = parts[i]
    const val = parts[i + 1]
    const num = parseFloat(val)
    fields[key] = isFinite(num) ? num : 0
  }
  return { time, fields }
}

// 解析整个日志文本 → 数组 [{time, fields}]
export function parseLog(text) {
  const lines = String(text || '').split('\n')
  const out = []
  for (const line of lines) {
    const r = parseLine(line)
    if (r) out.push(r)
  }
  return out
}

// 提取某个字段的时间序列 [{time, value}]
export function extractSeries(records, field) {
  const out = []
  for (const r of records) {
    if (r.fields && r.fields[field] !== undefined) {
      out.push({ time: r.time, value: r.fields[field] })
    }
  }
  return out
}

// 降采样：最多保留 maxPoints 个点（均匀抽取，保留首尾）
export function downsample(series, maxPoints) {
  const n = series.length
  if (n === 0) return []
  const m = maxPoints || 100
  if (n <= m) return series
  const out = []
  const step = (n - 1) / (m - 1)
  for (let i = 0; i < m; i++) {
    const idx = Math.round(i * step)
    out.push(series[idx])
  }
  return out
}

// 计算序列的 min/max（用于图表缩放）
export function range(series) {
  let min = Infinity
  let max = -Infinity
  for (const p of series) {
    if (p.value < min) min = p.value
    if (p.value > max) max = p.value
  }
  if (min === Infinity) return { min: 0, max: 1 }
  // 上下留 10% 余量
  const pad = (max - min) * 0.1 || max * 0.1 || 1
  return { min: Math.max(0, min - pad), max: max + pad }
}

// 把值归一化到 0-1（用于柱状图高度）
export function normalize(series) {
  const r = range(series)
  const span = r.max - r.min
  if (span <= 0) return series.map(() => 0.5)
  return series.map((p) => ({ time: p.time, value: (p.value - r.min) / span }))
}

// 值格式化：大数转 KB/MB
export function fmtVal(v) {
  const n = Number(v)
  if (!isFinite(n)) return String(v)
  if (Math.abs(n) >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'M'
  if (Math.abs(n) >= 1024) return (n / 1024).toFixed(0) + 'K'
  return n.toFixed(1)
}
