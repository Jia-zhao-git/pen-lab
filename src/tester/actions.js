// 整机测试控制层：通过 execShell 启停设备端 shell 脚本（monkey.sh / grafana.sh）。
//
// 核心机制：小程序运行在 QuickJS 沙箱里，但 platform.js 的 execShell
// 通过 global.Global.execShell 能执行任意系统命令（参考项目用它跑过 curl/pkill）。
// 整机测试（随机点击/扫描/拍照等）由设备端 shell 脚本承担，App 只做控制面板：
//   - 点「开始」= 同时启动 monkey.sh + grafana.sh（后台 setsid）
//   - 点「停止」= 同时 pkill 两个脚本
//
// 为什么不用 App 直接注入 send_event：
//   参考项目 api.js 实测，execShell 是同步阻塞的，且 App 在前台注入触摸会点到自己，
//   容易形成死锁、拖垮整个 miniapp 运行时。shell 脚本独立进程，稳定得多。
//
// 脚本内容内嵌在 App 里（grafana-script.js / monkey-script.js），
// 首次启动时自动落地到设备，不需要每次手动 push。

import { execShell, readText, writeText, ensureAppDir, joinPath, sleep, shq } from '../services/platform.js'
import { GRAFANA_SCRIPT } from './grafana-script.js'
import { MONKEY_SCRIPT } from './monkey-script.js'

// 脚本落地路径
const SCRIPTS = [
  { path: '/userdisk/grafana.sh', content: GRAFANA_SCRIPT, tag: 'grafana.sh' },
  { path: '/userdisk/monkey.sh', content: MONKEY_SCRIPT, tag: 'monkey.sh' }
]

// 确保脚本已落地（不存在则从内嵌内容写出来），返回是否全部落地成功
export async function ensureScripts() {
  let allOk = true
  for (const s of SCRIPTS) {
    try {
      const existing = await readText(s.path, 1)
      if (existing && existing.length > 100) continue
      writeText(s.path, s.content)
      const verify = await readText(s.path, 1)
      if (!verify || verify.length <= 100) allOk = false
    } catch (e) {
      allOk = false
    }
  }
  return allOk
}

// 后台启动一个 shell 脚本（可选参数），并把它的 PID 记录到 pidfile。
// 参考项目实测：execShell 同步阻塞，后台命令必须用 setsid + sh -c 包裹 +
// </dev/null 重定向 stdin，否则 execShell 会一直等命令结束，主线程冻结。
// 为什么用 pidfile 而不是 pkill：pkill -f 会匹配到「命令行含关键词的自己」
// （执行 pkill 的 shell 命令行里也有脚本名），导致 pkill 连自己一起杀、命令中断，
// 目标脚本反而没被杀干净。用 pidfile + kill 按 PID 精确杀，彻底避免自匹配。
function launchDetached(scriptPath, args, pidFile) {
  // $$ = 这个 sh -c 的 PID；exec 用脚本替换当前进程，PID 不变，所以 pidfile 记录的
  // 就是脚本进程的 PID。
  const cmd = 'echo $$ > ' + shq(pidFile) + '; exec sh ' + shq(scriptPath) + (args ? ' ' + shq(args) : '')
  execShell('setsid sh -c ' + shq(cmd) + ' >/dev/null 2>&1 </dev/null &')
}

// 按 pidfile 精确杀脚本进程
function killByPidFile(pidFile) {
  execShell('kill -9 $(cat ' + shq(pidFile) + ') 2>/dev/null; rm -f ' + shq(pidFile) + '; true')
}

const MONKEY_PID = '/userdisk/monkey.pid'
const GRAFANA_PID = '/userdisk/grafana.pid'

// 启动测试：同时启动 monkey.sh（指定模式）+ grafana.sh
// mode: ''(混合) | dict | xiaop | ocr | rand | app | 07ocr | sleepwake | keys
export function startTest(mode) {
  // 先清理残留实例（用 pidfile 精确杀）
  killByPidFile(MONKEY_PID)
  killByPidFile(GRAFANA_PID)
  launchDetached('/userdisk/monkey.sh', mode || '', MONKEY_PID)
  launchDetached('/userdisk/grafana.sh', '', GRAFANA_PID)
  // 稍后返回桌面，让 monkey.sh 在系统层操作，而不是黑掉测试 App 自己
  execShell('sleep 1; send_event asr press 2>/dev/null; sleep 0.2; send_event asr release 2>/dev/null; true')
}

// 停止测试：同时停止 monkey.sh + grafana.sh
export function stopTest() {
  killByPidFile(MONKEY_PID)
  killByPidFile(GRAFANA_PID)
}

// 判断某个脚本是否在运行（读 pidfile，检查 PID 是否还活着）
async function scriptRunning(pidFile) {
  const out = joinPath(ensureAppDir(), 'alive.txt')
  execShell('kill -0 $(cat ' + shq(pidFile) + ') 2>/dev/null && echo alive > ' + shq(out) + ' || rm -f ' + shq(out) + '; true')
  await sleep(300)
  const txt = await readText(out, 1)
  return !!(txt && String(txt).indexOf('alive') >= 0)
}

export async function monkeyRunning() {
  return await scriptRunning('/userdisk/monkey.pid')
}

export async function grafanaRunning() {
  return await scriptRunning('/userdisk/grafana.pid')
}
