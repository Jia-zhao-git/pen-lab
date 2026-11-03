import { GRAFANA_SCRIPT } from '../src/tester/grafana-script.js'

const original = await import('fs').then(fs => fs.readFileSync('D:/grafana.sh', 'utf-8'))

if (GRAFANA_SCRIPT === original) {
  console.log('✓ 内嵌内容与原脚本一致，长度', GRAFANA_SCRIPT.length)
} else {
  console.log('✗ 不一致！内嵌长度', GRAFANA_SCRIPT.length, '原长度', original.length)
  // 找第一个不同处
  for (let i = 0; i < Math.min(GRAFANA_SCRIPT.length, original.length); i++) {
    if (GRAFANA_SCRIPT[i] !== original[i]) {
      console.log('第一个差异在位置', i)
      console.log('内嵌:', JSON.stringify(GRAFANA_SCRIPT.slice(i, i+30)))
      console.log('原:', JSON.stringify(original.slice(i, i+30)))
      break
    }
  }
}
