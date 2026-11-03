// runner 自测（Node 直跑）：验证测试运行器本身的正确性。
// 整机用例依赖设备（execShell/send_event），只在设备上跑。

import { createRunner } from '../src/tester/runner.js'

const tr = createRunner()

tr.test('断言 ok 通过', (t) => { t.ok(true, '应通过') })
tr.test('断言 eq 通过', (t) => { t.eq(1 + 1, 2, '1+1=2') })
tr.test('异步用例', async (t) => { await new Promise(r => setTimeout(r, 10)); t.ok(true, '异步完成') })
tr.test('断言失败被捕获', (t) => { t.ok(false, '这个应该失败') })
tr.test('抛异常被捕获', () => { throw new Error('异常') })

const out = await tr.run((r, done, total) => {
  console.log('  ' + (r.ok ? '✓' : '✗') + ' ' + r.name + (r.ok ? '' : ' → ' + r.error))
})

console.log('')
console.log('通过 ' + out.pass + ' / 失败 ' + out.fail + ' / 共 ' + out.total)
// 期望 3 通过 2 失败
if (out.pass !== 3 || out.fail !== 2) {
  console.log('✗ 运行器统计不正确')
  process.exit(1)
}
console.log('运行器自测通过 ✓')
