// 整机操作封装：通过 execShell 驱动系统能力。
//
// 核心机制：小程序运行在 QuickJS 沙箱里，但 platform.js 的 execShell
// 通过 global.Global.execShell 能执行任意系统命令（参考项目用它跑过 curl/pkill）。
// 所以整机测试 App 靠这几条命令驱动：
//   - miniapp_cli start <appid>  启动任意系统应用
//   - send_event <key> <action>  注入按键/触摸
//   - miniapp_cli captureFB      截 framebuffer
//   - miniapp_cli memoryApp      查内存
//
// 注意（真机事实）：
//   - execShell 无回显、异步返回 boolean，命令产物要重定向到文件再读
//   - execShell 是同步阻塞的（参考项目 api.js 实测），长命令会卡 UI，要控制命令时长

import { execShell, readText, writeText, ensureAppDir, joinPath, sleep, shq } from '../services/platform.js'

// 系统应用 appid 映射（从 presetpkgs manifest.json 提取）
export const SYSTEM_APPS = {
  dict: '8080252464522508',      // 有道词典（点查）
  ocrScan: '8001733883553973',   // 提笔即扫OCR（扫描）
  aiPhoto: '8001699004677776',   // AI拍照
  recorder: '8001670668055425',  // 录音服务
  aiTeacher: '8001707294117702', // 小P老师（语音问答）
  inputMethod: '8001666679481944', // 有道输入法
  desktop: '8080222437664451',   // 桌面
  settings: '8080272425914438'   // 设置
}

// ---- 按键 ----
// send_event 支持的按键：camera/asr/menu/touch/screen_off/power
export function sendKey(key, action) {
  const a = action || 'press'
  execShell('send_event ' + shq(key) + ' ' + shq(a) + ' 2>/dev/null; true')
}

export function pressKey(key) {
  sendKey(key, 'press')
  sendKey(key, 'release')
}

export function goHome() {
  pressKey('asr') // 语音键 = 返回桌面
}

export function scan() {
  pressKey('camera') // 相机键 = 扫描
}

export function menu() {
  pressKey('menu')
}

export function power() {
  pressKey('power')
}

// ---- 触摸 ----
// 触摸坐标：X 0-279, Y 0-935（竖屏，origin 左上）
export function touch(x, y) {
  execShell('send_event touch press ' + x + ' ' + y + ' 2>/dev/null; sleep 0.1; send_event touch release 2>/dev/null; true')
}

export function swipe(x1, y1, x2, y2, steps) {
  const n = steps || 8
  execShell('send_event touch press ' + x1 + ' ' + y1 + ' 2>/dev/null; true')
  for (let i = 1; i <= n; i++) {
    const cx = Math.round(x1 + (x2 - x1) * i / n)
    const cy = Math.round(y1 + (y2 - y1) * i / n)
    execShell('send_event touch slip ' + cx + ' ' + cy + ' 2>/dev/null; true')
  }
  execShell('send_event touch release ' + x2 + ' ' + y2 + ' 2>/dev/null; true')
}

// ---- 应用启动 ----
export function startApp(appid) {
  execShell('miniapp_cli start ' + appid + ' 2>/dev/null; true')
}

// ---- 截图 ----
export function screenshot(name) {
  const path = joinPath(ensureAppDir('shots'), name + '.png')
  execShell('miniapp_cli captureFB ' + shq(path) + ' 2>/dev/null; true')
  return path
}

// ---- 内存 ----
export async function memoryInfo() {
  const out = joinPath(ensureAppDir(), 'mem.txt')
  execShell('miniapp_cli memoryApp > ' + shq(out) + ' 2>/dev/null; true')
  await sleep(300)
  const txt = await readText(out, 1)
  if (!txt) return null
  // 提取 fordblks（空闲块）
  const m = String(txt).match(/fordblks=(\d+)/)
  return m ? { fordblks: parseInt(m[1], 10), raw: String(txt) } : { raw: String(txt) }
}

// ---- 崩溃计数 ----
export async function crashCount() {
  const txt = await readText('/tmp/app_crash_count', 1)
  return txt ? parseInt(String(txt).trim(), 10) || 0 : 0
}

// 通用：执行一条命令并把 stdout 重定向到文件读回
export async function runCmd(cmd) {
  const out = joinPath(ensureAppDir(), 'cmdout.txt')
  execShell(cmd + ' > ' + shq(out) + ' 2>&1; true')
  await sleep(200)
  return await readText(out, 1)
}
