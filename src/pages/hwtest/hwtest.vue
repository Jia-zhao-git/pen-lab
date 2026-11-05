<template>
    <div class="ts-page">

        <div class="ts-top">
            <div class="ts-chip" @click="back"><text class="ts-chiptxt">返回</text></div>
            <text class="ts-title">硬件测试</text>
            <div class="ts-chip" @click="runAll"><text class="ts-chiptxt">全部测试</text></div>
        </div>

        <scroller class="ts-scroll" scroll-direction="vertical">
            <div class="ts-content">
                <div v-if="summary" class="ts-summary" :style="summaryStyle">
                    <text class="ts-summarytxt">{{ summaryText }}</text>
                </div>

                <div v-for="(t, ti) in testItems" :key="t.key" class="ts-row">
                    <text :class="statusClass(t)">{{ statusMark(t) }}</text>
                    <text class="ts-name">{{ t.label }}</text>
                    <text v-if="t.msg" class="ts-msg">{{ t.msg }}</text>
                    <div class="ts-run" @click="runOne(t)"><text class="ts-runtxt">测</text></div>
                </div>

                <text v-if="!running && !hasResult" class="ts-empty">点「全部测试」或单项「测」按钮</text>
                <text v-if="running" class="ts-running">测试中…</text>
            </div>
        </scroller>

    </div>
</template>

<script>
import { HW_TESTS } from '../../services/hwtest.js'
import { log } from '../../services/platform.js'

export default {
    name: 'hwtest',
    data() {
        return {
            testItems: HW_TESTS.map((t) => ({ key: t.key, label: t.label, status: '', msg: '' })),
            running: false,
            summary: null
        }
    },
    computed: {
        hasResult() {
            return this.testItems.some((t) => t.status !== '')
        },
        summaryText() {
            const s = this.summary
            if (!s) return ''
            return '通过 ' + s.pass + ' / 失败 ' + s.fail + ' / 共 ' + s.total
        },
        summaryStyle() {
            const s = this.summary
            if (!s) return {}
            return { backgroundColor: s.fail === 0 ? '#1d2b23' : '#3a1f1f' }
        }
    },
    mounted() {
        log('hwtest mounted')
    },
    methods: {
        statusClass(t) {
            if (t.status === 'ok') return 'ts-status-ok'
            if (t.status === 'fail') return 'ts-status-fail'
            return 'ts-status-idle'
        },
        statusMark(t) {
            if (t.status === 'ok') return '✓'
            if (t.status === 'fail') return '✗'
            return '·'
        },
        async runOne(t) {
            if (this.running) return
            this.running = true
            t.status = ''
            t.msg = '测试中…'
            const def = HW_TESTS.find((x) => x.key === t.key)
            try {
                const r = await def.run()
                t.status = r.ok ? 'ok' : 'fail'
                t.msg = r.msg
                log('test ' + t.key + ' ' + (r.ok ? 'PASS' : 'FAIL'))
            } catch (e) {
                t.status = 'fail'
                t.msg = '异常：' + (e && e.message ? e.message : e)
            }
            this.running = false
        },
        async runAll() {
            if (this.running) return
            this.running = true
            this.summary = null
            let pass = 0
            let fail = 0
            for (const t of this.testItems) {
                t.status = ''
                t.msg = ''
            }
            for (const t of this.testItems) {
                const def = HW_TESTS.find((x) => x.key === t.key)
                try {
                    const r = await def.run()
                    t.status = r.ok ? 'ok' : 'fail'
                    t.msg = r.msg
                    if (r.ok) pass++; else fail++
                } catch (e) {
                    t.status = 'fail'
                    t.msg = '异常'
                    fail++
                }
            }
            this.summary = { pass, fail, total: this.testItems.length }
            log('hw test 全部完成 pass=' + pass + ' fail=' + fail)
            this.running = false
        },
        back() {
            try { $falcon.navTo('index', {}) } catch (e) { /* 忽略 */ }
        }
    }
}
</script>

<style>
.ts-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.ts-top {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.ts-chip {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 6px;
    background-color: #2f5c8a;
    margin-right: 10px;
}

.ts-chiptxt {
    font-size: 13px;
    color: #e8e8ee;
}

.ts-title {
    font-size: 16px;
    color: #e8e8ee;
    flex: 1;
}

.ts-scroll {
    flex: 1;
}

.ts-content {
    padding-left: 16px;
    padding-right: 16px;
    padding-top: 8px;
    padding-bottom: 8px;
}

.ts-summary {
    height: 30px;
    flex-direction: row;
    align-items: center;
    padding-left: 10px;
    border-radius: 6px;
    margin-bottom: 8px;
}

.ts-summarytxt {
    font-size: 14px;
    color: #e8e8ee;
}

.ts-row {
    flex-direction: row;
    align-items: center;
    min-height: 34px;
    border-bottom-width: 1px;
    border-bottom-color: #26262e;
}

.ts-status-ok {
    font-size: 14px;
    color: #7fd39a;
    width: 24px;
}

.ts-status-fail {
    font-size: 14px;
    color: #f08a83;
    width: 24px;
}

.ts-status-idle {
    font-size: 14px;
    color: #55555f;
    width: 24px;
}

.ts-name {
    font-size: 14px;
    color: #d8d8e0;
    width: 130px;
}

.ts-msg {
    font-size: 12px;
    color: #9a9aa8;
    flex: 1;
}

.ts-run {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 24px;
    border-radius: 5px;
    background-color: #2a2a33;
}

.ts-runtxt {
    font-size: 13px;
    color: #9a9aa8;
}

.ts-empty {
    font-size: 15px;
    color: #6a6a78;
    margin: 20px;
}

.ts-running {
    font-size: 14px;
    color: #7fd39a;
    margin-top: 8px;
}
</style>
