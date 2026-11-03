// 随机稳定性(monkey)测试：模拟用户随机触摸/按键/启动应用，长时间跑，监控崩溃和内存。
//
// 这个测试是「可配置轮数」的——由页面传入轮数，每轮做一组随机操作。

import { startApp, touch, swipe, pressKey, screenshot, memoryInfo, crashCount, goHome, SYSTEM_APPS, startGrafana, stopGrafana, grafanaRunning } from '../actions.js'
import { sleep } from '../../services/platform.js'

// 模块级停止标志：由页面 stopAll 设置，monkey 循环检查它来中断
let stopRequested = false
export function requestStop() { stopRequested = true }
export function resetStop() { stopRequested = false }
function shouldStop() { return stopRequested }

// 随机整数 [min, max]
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 随机挑一个系统应用启动
const APP_IDS = [
  SYSTEM_APPS.dict, SYSTEM_APPS.ocrScan, SYSTEM_APPS.aiPhoto,
  SYSTEM_APPS.aiTeacher, SYSTEM_APPS.recorder, SYSTEM_APPS.settings
]

function randomAction() {
  const kind = rand(0, 3)
  switch (kind) {
    case 0: // 随机触摸
      return touch(rand(10, 270), rand(10, 900))
    case 1: // 随机滑动
      return swipe(rand(40, 240), rand(200, 700), rand(40, 240), rand(200, 700), 6)
    case 2: // 随机按键
      return pressKey(['asr', 'menu', 'camera', 'power'][rand(0, 3)])
    default: // 随机启动应用
      return startApp(APP_IDS[rand(0, APP_IDS.length - 1)])
  }
}

// 单轮 monkey：做 N 次随机操作（可被停止标志中断）
async function monkeyRound(ops, ctx) {
  const before = await crashCount()
  for (let i = 0; i < ops; i++) {
    if (shouldStop()) break
    randomAction()
    await sleep(rand(200, 600))
  }
  const after = await crashCount()
  if (!shouldStop() && after !== before) {
    ctx.ok(false, '崩溃计数从 ' + before + ' 增到 ' + after)
  }
  goHome()
  await sleep(800)
}

export function register(tr, options) {
  const opts = options || {}
  const rounds = opts.rounds || 5      // 轮数
  const opsPerRound = opts.opsPerRound || 10  // 每轮操作数

  resetStop()

  // 开始前启动 grafana 记录设备状态
  tr.test('随机稳定性：启动监控(grafana.sh)', async (t) => {
    startGrafana()
    await sleep(800)
    const running = await grafanaRunning()
    t.ok(running, 'grafana.sh 应已启动')
  })

  tr.test('随机稳定性：内存基线', async (t) => {
    const mem = await memoryInfo()
    t.ok(mem && mem.fordblks > 0, '应能读到内存基线')
  })

  tr.test('随机稳定性：' + rounds + '轮 × ' + opsPerRound + '操作', async (t) => {
    for (let r = 0; r < rounds; r++) {
      if (shouldStop()) break
      await monkeyRound(opsPerRound, t)
    }
    t.ok(true, shouldStop() ? '已被用户停止' : '完成 ' + rounds + ' 轮随机操作')
  })

  tr.test('随机稳定性：结束后崩溃计数', async (t) => {
    const c = await crashCount()
    t.ok(c === 0, '崩溃计数应为0，实际 ' + c)
  })

  // 结束后停止 grafana（与启动同步）
  tr.test('随机稳定性：停止监控(grafana.sh)', async (t) => {
    stopGrafana()
    await sleep(500)
    const running = await grafanaRunning()
    t.ok(!running, 'grafana.sh 应已停止')
  })
}
