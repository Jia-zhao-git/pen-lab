// 日志查看：读各日志源（系统日志/应用日志/测试总结/崩溃信息）。
//
// 日志源（实测位置）：
//   - 系统日志 /data/syslog/messages（+ .0/.1 归档）
//   - 主应用 /userdata/applog/DictPen_*.log
//   - 音频播放 /userdata/applog/SoundPlayer.log
//   - 录音 /userdata/applog/SoundRecord.log
//   - 用户操作 /userdata/applog/UserAction.log
//   - monkey 测试总结 /userdisk/testlog/test_summary_*.txt
//   - grafana 监控 /userdisk/testlog/grafana/*.log

import { execShell, readText, shq } from './platform.js'

// 日志源定义
export const LOG_SOURCES = [
  { key: 'system', label: '系统日志', path: '/data/syslog/messages' },
  { key: 'dictpen', label: '主应用', path: null, dynamic: true },  // DictPen_*.log 动态
  { key: 'soundplayer', label: '音频播放', path: '/userdata/applog/SoundPlayer.log' },
  { key: 'soundrecord', label: '录音', path: '/userdata/applog/SoundRecord.log' },
  { key: 'useraction', label: '用户操作', path: '/userdata/applog/UserAction.log' },
  { key: 'monkey', label: '测试总结', path: null, dynamic: true },  // test_summary_*.txt 动态
  { key: 'grafana', label: '监控日志', path: '/userdisk/testlog/grafana/mem_info.log' }
]

// 动态解析实际文件路径（* 通配的日志）
export async function resolveDynamicPath(key) {
  if (key === 'dictpen') {
    // 找最新的 DictPen_*.log
    const out = '/tmp/penlab_ls.txt'
    execShell('ls -t /userdata/applog/DictPen_*.log > ' + shq(out) + ' 2>/dev/null; true')
    const txt = await readText(out, 1)
    const first = String(txt || '').trim().split('\n')[0]
    return first || null
  }
  if (key === 'monkey') {
    const out = '/tmp/penlab_ls2.txt'
    execShell('ls -t /userdisk/testlog/test_summary_*.txt > ' + shq(out) + ' 2>/dev/null; true')
    const txt = await readText(out, 1)
    const first = String(txt || '').trim().split('\n')[0]
    return first || null
  }
  return null
}

// 读日志尾部（用 tail -n 限制行数，避免大文件撑爆内存）
export async function readLogTail(path, lines) {
  if (!path) return ''
  const n = lines || 200
  const out = '/tmp/penlab_logtail.txt'
  try {
    execShell('tail -n ' + n + ' ' + shq(path) + ' > ' + shq(out) + ' 2>/dev/null; true')
    const txt = await readText(out, 1)
    return txt ? String(txt) : ''
  } catch (e) {
    return ''
  }
}

// 按关键词过滤日志行
export function filterLines(text, keyword) {
  const kw = String(keyword || '').trim().toLowerCase()
  if (!kw) return text
  const lines = String(text).split('\n')
  const matched = lines.filter((l) => l.toLowerCase().indexOf(kw) >= 0)
  return matched.join('\n')
}

// 统计日志中的错误/崩溃关键词出现次数
export function countKeywords(text) {
  const s = String(text || '').toLowerCase()
  return {
    error: (s.match(/error/g) || []).length,
    crash: (s.match(/crash/g) || []).length,
    fail: (s.match(/fail/g) || []).length,
    oom: (s.match(/oom|out of memory/g) || []).length
  }
}
