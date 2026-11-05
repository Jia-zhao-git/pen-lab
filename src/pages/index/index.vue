<template>
    <div class="pl-page">

        <!-- 顶栏 -->
        <div class="pl-top">
            <text class="pl-title">词典笔测试实验室</text>
            <text class="pl-version">v{{ version }}</text>
            <div class="pl-chip" @click="openPage('device')"><text class="pl-chiptxt">设备</text></div>
            <div class="pl-chip" @click="openPage('hwtest')"><text class="pl-chiptxt">硬件</text></div>
            <div class="pl-chip" @click="openPage('chart')"><text class="pl-chiptxt">图表</text></div>
        </div>

        <!-- 测试项菜单：横向一排按钮 -->
        <div class="pl-menu">
            <div v-for="(m, mi) in menuItems" :key="m.key" :class="menuClass(m)" @click="runMenu(m)">
                <text :class="menuTxtClass(m)">{{ m.label }}</text>
            </div>
        </div>

        <!-- 结果区 -->
        <scroller class="pl-scroll" scroll-direction="vertical">
            <div class="pl-content">
                <div v-if="summary" class="pl-summary" :style="summaryStyle">
                    <text class="pl-summarytxt">{{ summaryText }}</text>
                </div>

                <div v-for="(r, ri) in results" :key="ri" class="pl-row">
                    <text :class="r.ok ? 'pl-status-ok' : 'pl-status-fail'">{{ r.ok ? '✓' : '✗' }}</text>
                    <text class="pl-name">{{ r.name }}</text>
                    <text class="pl-ms">{{ r.ms }}ms</text>
                </div>
                <text v-for="(r, ri) in failedResults" :key="'e' + ri" class="pl-err">✗ {{ r.name }}：{{ r.error }}</text>

                <text v-if="!running && !results.length" class="pl-empty">点上方按钮选择测试项</text>
                <text v-if="running" class="pl-running">测试运行中…</text>
            </div>
        </scroller>

        <!-- 底部：停止 + 清空 -->
        <div class="pl-foot">
            <div class="pl-btn" @click="stopAll"><text class="pl-btntxt">停止</text></div>
            <div class="pl-btn" @click="clearResults"><text class="pl-btntxt">清空</text></div>
        </div>

    </div>
</template>

<script>
import { APP_VERSION } from '../../lib/appversion.js'
import { log } from '../../services/platform.js'
import { sleep } from '../../services/platform.js'
import { ensureScripts, startTest, stopTest, monkeyRunning, grafanaRunning } from '../../tester/actions.js'

export default {
    name: 'index',
    data() {
        return {
            version: APP_VERSION,
            results: [],
            running: false,
            summary: null,
            stopFlag: false,
            currentMode: '',
            menuItems: [
                { key: 'monkey', label: '随机稳定性', mode: '' },
                { key: 'dict', label: '点查', mode: 'dict' },
                { key: 'photo', label: '拍照', mode: 'rand' },
                { key: 'scan', label: '扫描', mode: 'ocr' },
                { key: 'voice', label: '语音问答', mode: 'xiaop' }
            ]
        }
    },
    computed: {
        summaryText() {
            const s = this.summary
            if (!s) return ''
            return '通过 ' + s.pass + ' / 失败 ' + s.fail + ' / 共 ' + s.total + ' 项'
        },
        summaryStyle() {
            const s = this.summary
            if (!s) return {}
            return { backgroundColor: s.fail === 0 ? '#1d2b23' : '#3a1f1f' }
        },
        failedResults() {
            return this.results.filter((r) => !r.ok && r.error)
        }
    },
    mounted() {
        log('pen-lab mounted')
    },
    methods: {
        menuClass(m) {
            return this.running ? 'pl-menu-item pl-menu-item-off' : 'pl-menu-item'
        },
        menuTxtClass(m) {
            return 'pl-menu-txt'
        },
        async runMenu(m) {
            if (this.running) return
            this.running = true
            this.stopFlag = false
            this.results = []
            this.summary = null
            this.currentMode = m.mode || ''

            await this.runScriptTest(m)
            this.running = false
        },
        // 通用：落地脚本 → 启动 monkey.sh(模式) + grafana.sh → 持续跑直到停止
        async runScriptTest(m) {
            const label = m.label
            const mode = m.mode || ''

            const landed = await ensureScripts()
            this.results.push({ name: '落地测试脚本', ok: landed, error: landed ? '' : '脚本落地失败', ms: 0 })
            if (!landed) {
                this.summary = { pass: 0, fail: 1, total: 1 }
                return
            }

            startTest(mode)
            await sleep(1500)
            const monkey = await monkeyRunning()
            const grafana = await grafanaRunning()
            this.results.push({ name: '启动 monkey.sh（' + label + '）', ok: monkey, error: '', ms: 0 })
            this.results.push({ name: '启动 grafana.sh', ok: grafana, error: '', ms: 0 })

            log(label + '测试运行中，等待停止')
            // 持续跑，直到 stopFlag 被「停止」按钮设置
            while (!this.stopFlag) {
                await sleep(1000)
            }

            // 停止两个脚本
            stopTest()
            await sleep(1000)
            const mStopped = !(await monkeyRunning())
            const gStopped = !(await grafanaRunning())
            this.results.push({ name: '停止 monkey.sh', ok: mStopped, error: '', ms: 0 })
            this.results.push({ name: '停止 grafana.sh', ok: gStopped, error: '', ms: 0 })

            const pass = this.results.filter((r) => r.ok).length
            const fail = this.results.filter((r) => !r.ok).length
            this.summary = { pass: pass, fail: fail, total: this.results.length }
            log(label + '测试已停止')
        },
        async stopAll() {
            this.stopFlag = true
            // 同步停止 monkey.sh 和 grafana.sh（双保险）
            stopTest()
            log('用户请求停止测试')
        },
        clearResults() {
            this.results = []
            this.summary = null
        },
        openChart() {
            try { $falcon.navTo('chart', {}) } catch (e) { log('navTo chart 失败') }
        },
        openPage(page) {
            try { $falcon.navTo(page, {}) } catch (e) { log('navTo ' + page + ' 失败') }
        }
    }
}
</script>

<style>
.pl-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.pl-top {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.pl-title {
    font-size: 17px;
    color: #e8e8ee;
    flex: 1;
}

.pl-version {
    font-size: 13px;
    color: #6a6a78;
    margin-right: 10px;
}

.pl-chip {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 6px;
    background-color: #2f5c8a;
}

.pl-chiptxt {
    font-size: 13px;
    color: #e8e8ee;
}

.pl-menu {
    height: 48px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1c1c22;
}

.pl-menu-item {
    flex-direction: row;
    align-items: center;
    height: 30px;
    padding-left: 14px;
    padding-right: 14px;
    border-radius: 6px;
    background-color: #2f5c8a;
    margin-right: 8px;
}

.pl-menu-item-off {
    flex-direction: row;
    align-items: center;
    height: 30px;
    padding-left: 14px;
    padding-right: 14px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-right: 8px;
}

.pl-menu-txt {
    font-size: 14px;
    color: #e8e8ee;
}

.pl-scroll {
    flex: 1;
}

.pl-content {
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 8px;
    padding-bottom: 8px;
}

.pl-summary {
    height: 30px;
    flex-direction: row;
    align-items: center;
    padding-left: 10px;
    border-radius: 6px;
    margin-bottom: 8px;
}

.pl-summarytxt {
    font-size: 14px;
    color: #e8e8ee;
}

.pl-row {
    flex-direction: row;
    align-items: center;
    padding-top: 4px;
    padding-bottom: 4px;
    border-bottom-width: 1px;
    border-bottom-color: #26262e;
}

.pl-status-ok {
    font-size: 14px;
    color: #7fd39a;
    margin-right: 8px;
}

.pl-status-fail {
    font-size: 14px;
    color: #f08a83;
    margin-right: 8px;
}

.pl-name {
    font-size: 14px;
    color: #d8d8e0;
    flex: 1;
}

.pl-ms {
    font-size: 12px;
    color: #6a6a78;
}

.pl-err {
    font-size: 12px;
    color: #f0b866;
    margin-top: 2px;
    margin-left: 22px;
}

.pl-empty {
    font-size: 15px;
    color: #6a6a78;
    margin-top: 20px;
}

.pl-running {
    font-size: 15px;
    color: #7fd39a;
    margin-top: 10px;
}

.pl-foot {
    height: 44px;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    background-color: #1e1e24;
}

.pl-btn {
    flex-direction: row;
    align-items: center;
    height: 30px;
    padding-left: 18px;
    padding-right: 18px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-left: 8px;
    margin-right: 8px;
}

.pl-btntxt {
    font-size: 14px;
    color: #9a9aa8;
}
</style>
