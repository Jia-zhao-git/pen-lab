// chartdata 解析测试（Node 直跑）

import { parseLine, parseLog, extractSeries, downsample, range, normalize, fmtVal } from '../src/lib/chartdata.js'

let pass = 0
let fail = 0
const fails = []
function ok(cond, name) { if (cond) { pass++ } else { fail++; fails.push(name) } }
function eq(a, b, name) { ok(JSON.stringify(a) === JSON.stringify(b), name) }

// parseLine
{
  const r = parseLine('20261105 10:51:05|MemAvailable|133592|MemFree|39868|Swap|83456')
  ok(r !== null, 'parseLine 解析成功')
  eq(r.time, '20261105 10:51:05', '时间正确')
  eq(r.fields.MemAvailable, 133592, 'MemAvailable 值')
  eq(r.fields.MemFree, 39868, 'MemFree 值')
  eq(r.fields.Swap, 83456, 'Swap 值')
}

// parseLine 空行
eq(parseLine(''), null, '空行返回 null')
eq(parseLine('   '), null, '空白返回 null')

// extractSeries
{
  const records = [
    { time: 't1', fields: { MemFree: 100, Swap: 50 } },
    { time: 't2', fields: { MemFree: 200 } },
    { time: 't3', fields: { Swap: 70 } }
  ]
  const s = extractSeries(records, 'MemFree')
  eq(s.length, 2, '提取 MemFree 两条')
  eq(s[0].value, 100, '第一条值')
  eq(s[1].value, 200, '第二条值')
}

// downsample
{
  const series = Array.from({ length: 10 }, (_, i) => ({ time: 't' + i, value: i }))
  const ds = downsample(series, 5)
  eq(ds.length, 5, '降采样到5点')
  eq(ds[0].value, 0, '保留首点')
  eq(ds[4].value, 9, '保留尾点')
  eq(downsample(series, 100).length, 10, '不足maxPoints不降采样')
}

// range
{
  const r = range([{ time: 'a', value: 10 }, { time: 'b', value: 50 }])
  ok(r.min < 10 && r.max > 50, 'range 留余量')
}

// normalize
{
  const s = [{ time: 'a', value: 0 }, { time: 'b', value: 100 }]
  const n = normalize(s)
  ok(n[0].value < n[1].value, '归一化保序')
}

// fmtVal
eq(fmtVal(500), '500.0', '小值')
eq(fmtVal(2048), '2K', 'KB')
eq(fmtVal(5 * 1024 * 1024), '5.0M', 'MB')

console.log('pass=' + pass + ' fail=' + fail)
if (fail) {
  for (const f of fails) console.log('  - ' + f)
  process.exit(1)
}
console.log('全部通过 ✓')
