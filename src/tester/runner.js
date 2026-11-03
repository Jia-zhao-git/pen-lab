// 轻量测试运行器（纯函数，可在 Node 下跑，也可在设备 QuickJS 上跑）。
//
// 用例用「名称 + 异步函数」注册，函数内用 assert/eq 断言。
// 每个用例独立 try/catch，一个失败不影响其它，汇总 PASS/FAIL。

export function createRunner() {
  const cases = []
  return {
    test(name, fn) {
      cases.push({ name: String(name), fn })
    },
    async run(onProgress, onCaseStart) {
      const results = []
      let pass = 0
      let fail = 0
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i]
        const start = Date.now()
        const r = { name: c.name, ok: true, error: '', ms: 0 }
        if (onCaseStart) {
          try { onCaseStart(c.name, i + 1, cases.length) } catch (e) { /* 忽略 */ }
        }
        try {
          const ctx = makeAssert(r)
          await c.fn(ctx)
          r.ok = !r.error
        } catch (e) {
          r.ok = false
          if (!r.error) r.error = (e && e.message) ? e.message : String(e)
        }
        r.ms = Date.now() - start
        results.push(r)
        if (r.ok) pass++; else fail++
        if (onProgress) {
          try { onProgress(r, i + 1, cases.length) } catch (e) { /* 忽略 */ }
        }
      }
      return { results, pass, fail, total: cases.length }
    }
  }
}

function makeAssert(r) {
  return {
    ok(cond, msg) {
      if (!cond) {
        r.error = msg || '断言失败'
        throw new Error(r.error)
      }
    },
    eq(a, b, msg) {
      const va = JSON.stringify(a)
      const vb = JSON.stringify(b)
      if (va !== vb) {
        r.error = (msg || '不相等') + ' → 期望 ' + vb + '，实际 ' + va
        throw new Error(r.error)
      }
    }
  }
}
