// 设备系统信息采集：通过 execShell 读各类系统信息。
//
// 采集维度（参考安卓诊断工具 AIDA64）：
//   - 设备标识：SKU / 序列号 / 固件版本
//   - CPU：型号 / 架构 / 核心数
//   - 内存：总/可用/空闲
//   - 存储：各分区容量
//   - 电池：容量/状态/充电类型/温度/电压
//   - 屏幕：亮度 / 分辨率
//   - 网络：IP / WiFi
//   - 蓝牙：地址 / 状态
//   - 触摸屏：型号
//   - 运行时长 / 崩溃计数

import { execShell, readText, joinPath, shq, sleep, dataDirBase } from './platform.js'

// 通用：执行命令并读回 stdout（重定向到临时文件）
async function sh(cmd) {
  const out = joinPath('/tmp', 'penlab_cmd_' + Math.floor(Math.random() * 100000) + '.txt')
  try {
    execShell(cmd + ' > ' + shq(out) + ' 2>&1; true')
    await sleep(150)
    const txt = await readText(out, 1)
    return txt ? String(txt) : ''
  } catch (e) {
    return ''
  }
}

// 读单个文件内容
async function cat(path) {
  return await sh('cat ' + shq(path) + ' 2>/dev/null')
}

// 提取 sku
export async function getSku() {
  const s = await cat('/data/cfg/sys_config.conf')
  const m = String(s).match(/sku=(\S+)/)
  return m ? m[1] : 'unknown'
}

// 序列号
export async function getSn() {
  const s = await sh('yd_misc_info_tool -r YD_LINUX_SN_ID -t string 2>/dev/null')
  return String(s).trim() || 'unknown'
}

// 固件版本
export async function getVersion() {
  const v = await cat('/Version')
  const m = String(v).match(/Version:\s*(\S+)/)
  return m ? m[1] : 'unknown'
}

// CPU 信息
export async function getCpu() {
  const info = await cat('/proc/cpuinfo')
  const model = String(info).match(/model name\s*:\s*(.+)/)
  const arch = String(info).match(/CPU architecture\s*:\s*(\d+)/)
  const cores = (String(info).match(/processor\s*:/g) || []).length
  return {
    model: model ? model[1].trim() : 'unknown',
    arch: arch ? 'ARMv' + arch[1] : 'unknown',
    cores: cores || 1
  }
}

// 内存信息（KB）
export async function getMemory() {
  const m = await cat('/proc/meminfo')
  const total = String(m).match(/MemTotal:\s*(\d+)/)
  const free = String(m).match(/MemFree:\s*(\d+)/)
  const avail = String(m).match(/MemAvailable:\s*(\d+)/)
  return {
    total: total ? Number(total[1]) : 0,
    free: free ? Number(free[1]) : 0,
    available: avail ? Number(avail[1]) : 0
  }
}

// 存储分区
export async function getStorage() {
  const df = await sh('df -k 2>/dev/null')
  // 解析 df 输出，找关键分区
  const parts = []
  const lines = String(df).split('\n')
  for (const line of lines) {
    if (!line || line.indexOf('Filesystem') >= 0) continue
    const cols = line.split(/\s+/)
    if (cols.length >= 6) {
      const mount = cols[5]
      // 只保留关键分区
      if (mount === '/' || mount === '/userdata' || mount === '/userdisk' || mount === '/tmp') {
        parts.push({
          mount: mount,
          totalKb: Number(cols[1]) || 0,
          usedKb: Number(cols[2]) || 0,
          availKb: Number(cols[3]) || 0,
          usePercent: cols[4] || ''
        })
      }
    }
  }
  return parts
}

// 电池信息
export async function getBattery() {
  const base = '/sys/class/power_supply/battery/'
  const capacity = await cat(base + 'capacity')
  const status = await cat(base + 'status')
  const chargeType = await cat(base + 'charge_type')
  const temp = await cat(base + 'temp')
  const voltage = await cat(base + 'voltage_now')
  return {
    capacity: Number(String(capacity).trim()) || 0,
    status: String(status).trim() || 'unknown',
    chargeType: String(chargeType).trim() || 'unknown',
    temp: (Number(String(temp).trim()) || 0) / 10,  // 0.1℃ 单位
    voltage: (Number(String(voltage).trim()) || 0) / 1000000  // uV → V
  }
}

// 屏幕亮度
export async function getBrightness() {
  const max = await cat('/sys/devices/platform/backlight/backlight/backlight/max_brightness')
  const cur = await cat('/sys/devices/platform/backlight/backlight/backlight/brightness')
  return {
    max: Number(String(max).trim()) || 255,
    current: Number(String(cur).trim()) || 0
  }
}

// 网络信息
export async function getNetwork() {
  const ip = await sh('ip addr show wlan0 2>/dev/null | grep "inet "')
  const m = String(ip).match(/inet\s+([\d.]+)/)
  return { ip: m ? m[1] : '未连接' }
}

// 蓝牙信息
export async function getBluetooth() {
  const bt = await sh('hciconfig hci0 2>/dev/null')
  const addr = String(bt).match(/BD Address:\s*([0-9A-F:]+)/)
  const isDown = String(bt).indexOf('DOWN') >= 0
  return {
    address: addr ? addr[1] : '无',
    state: isDown ? '关闭' : '开启'
  }
}

// 触摸屏型号
export async function getTouchPanel() {
  return await cat('/sys/class/input/event3/device/name')
}

// 运行时长
export async function getUptime() {
  const u = await cat('/proc/uptime')
  const sec = Number(String(u).split(/\s+/)[0]) || 0
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h + '小时' + m + '分'
}

// 崩溃计数
export async function getCrashCount() {
  const c = await cat('/tmp/app_crash_count')
  return Number(String(c).trim()) || 0
}

// 汇总采集所有设备信息
export async function collectDeviceInfo() {
  const [sku, sn, version, cpu, mem, storage, battery, brightness, net, bt, touch, uptime, crash] = await Promise.all([
    getSku(), getSn(), getVersion(), getCpu(), getMemory(), getStorage(),
    getBattery(), getBrightness(), getNetwork(), getBluetooth(), getTouchPanel(),
    getUptime(), getCrashCount()
  ])
  return {
    sku, sn, version, cpu, mem, storage, battery, brightness, net, bt, touch, uptime, crash,
    dataDir: dataDirBase()
  }
}
