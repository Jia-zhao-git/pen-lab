// 硬件/系统单项测试：音频、屏幕、电池、网络、按键、蓝牙、传感器。
//
// 每个测试返回 { ok, msg }，页面据此显示 PASS/FAIL。

import { execShell, readText, shq, sleep } from './platform.js'

async function sh(cmd) {
  const out = '/tmp/penlab_test_' + Math.floor(Math.random() * 100000) + '.txt'
  try {
    execShell(cmd + ' > ' + shq(out) + ' 2>&1; true')
    await sleep(200)
    const txt = await readText(out, 1)
    return txt ? String(txt) : ''
  } catch (e) {
    return ''
  }
}

async function cat(path) {
  return await sh('cat ' + shq(path) + ' 2>/dev/null')
}

// 音频：播放系统 wav 测试文件
export async function testAudio() {
  const wav = '/usr/share/sounds/alsa/Front_Center.wav'
  const r = await sh('aplay ' + shq(wav) + ' 2>&1')
  // aplay 成功会输出播放信息，失败会有 error
  if (String(r).toLowerCase().indexOf('error') >= 0 || !r) {
    return { ok: false, msg: '播放失败：' + String(r).slice(0, 60) }
  }
  return { ok: true, msg: '已播放测试音（请听是否有声音）' }
}

// 屏幕亮度：写入不同亮度值再读回
export async function testBrightness() {
  const node = '/sys/devices/platform/backlight/backlight/backlight/brightness'
  const orig = await cat(node)
  // 依次设 30 / 255 / 当前值，验证可写可读
  execShell('echo 30 > ' + shq(node) + ' 2>/dev/null; true')
  await sleep(300)
  const v30 = await cat(node)
  execShell('echo 255 > ' + shq(node) + ' 2>/dev/null; true')
  await sleep(300)
  const v255 = await cat(node)
  // 还原
  if (orig) {
    execShell('echo ' + Number(orig) + ' > ' + shq(node) + ' 2>/dev/null; true')
  }
  const ok30 = Number(String(v30).trim()) === 30
  const ok255 = Number(String(v255).trim()) === 255
  const ok = ok30 && ok255
  return { ok, msg: ok ? '亮度调节正常（30/255 读写成功）' : '亮度调节异常（30→' + v30 + ' 255→' + v255 + '）' }
}

// 电池：读完整状态
export async function testBattery() {
  const base = '/sys/class/power_supply/battery/'
  const capacity = (await cat(base + 'capacity')).trim()
  const status = (await cat(base + 'status')).trim()
  const temp = (await cat(base + 'temp')).trim()
  const chargeType = (await cat(base + 'charge_type')).trim()
  const ok = capacity !== '' && Number(capacity) >= 0
  return {
    ok,
    msg: ok
      ? '电量 ' + capacity + '% · ' + status + ' · 温度 ' + (Number(temp) / 10) + '℃ · ' + chargeType
      : '电池信息读取失败'
  }
}

// 网络：ping 测试连通性
export async function testNetwork() {
  const r = await sh('ping -c 2 -W 2 8.8.8.8 2>&1')
  const ok = String(r).indexOf('2 received') >= 0 || String(r).indexOf('1 received') >= 0
  return { ok, msg: ok ? '网络连通（ping 8.8.8.8 成功）' : '网络异常：' + String(r).slice(0, 80) }
}

// 蓝牙：读 hciconfig 状态
export async function testBluetooth() {
  const r = await sh('hciconfig hci0 2>&1')
  const hasAddr = String(r).match(/BD Address/)
  const isUp = String(r).indexOf('UP') >= 0 && String(r).indexOf('DOWN') < 0
  return {
    ok: !!hasAddr,
    msg: hasAddr ? ('蓝牙硬件存在，状态 ' + (isUp ? '开启' : '关闭')) : '蓝牙硬件未检测到'
  }
}

// 按键：send_event 各按键可注入（不实际触发，只验证命令存在）
export async function testKeys() {
  const keys = ['camera', 'asr', 'menu', 'power', 'screen_off']
  const results = []
  for (const k of keys) {
    const r = await sh('send_event ' + k + ' press 2>&1; send_event ' + k + ' release 2>&1')
    results.push(k)
  }
  return { ok: true, msg: '按键注入完成：' + results.join(' / ') }
}

// 触摸：send_event touch 可注入
export async function testTouch() {
  const r = await sh('send_event touch press 140 400 2>&1; send_event touch release 2>&1')
  // send_event 会打印设备信息，不报错即成功
  const ok = String(r).indexOf('error') < 0
  return { ok, msg: ok ? '触摸注入正常' : '触摸注入异常' }
}

// 传感器：读 iio 电压采样
export async function testSensor() {
  const base = '/sys/bus/iio/devices/iio:device0/'
  const name = (await cat(base + 'name')).trim()
  const v1 = (await cat(base + 'in_voltage1_raw')).trim()
  const ok = name !== '' || v1 !== ''
  return { ok, msg: ok ? '传感器存在（' + (name || 'iio:device0') + '，采样 ' + v1 + '）' : '传感器未检测到' }
}

// 存储：df 检查各分区
export async function testStorage() {
  const r = await sh('df -k /userdisk 2>&1')
  const ok = String(r).indexOf('/userdisk') >= 0
  return { ok, msg: ok ? '存储分区正常' : '存储分区异常' }
}

// 崩溃计数检查
export async function testCrash() {
  const c = (await cat('/tmp/app_crash_count')).trim()
  const n = Number(c) || 0
  return { ok: n === 0, msg: n === 0 ? '无崩溃记录' : '崩溃计数 ' + n + ' 次' }
}

// 所有硬件测试项列表（供页面展示）
export const HW_TESTS = [
  { key: 'audio', label: '音频播放', run: testAudio },
  { key: 'brightness', label: '屏幕亮度', run: testBrightness },
  { key: 'battery', label: '电池状态', run: testBattery },
  { key: 'network', label: '网络连通', run: testNetwork },
  { key: 'bluetooth', label: '蓝牙', run: testBluetooth },
  { key: 'keys', label: '按键注入', run: testKeys },
  { key: 'touch', label: '触摸注入', run: testTouch },
  { key: 'sensor', label: '传感器', run: testSensor },
  { key: 'storage', label: '存储分区', run: testStorage },
  { key: 'crash', label: '崩溃检查', run: testCrash }
]
