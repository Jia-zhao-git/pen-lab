<template>
    <div class="ch-page">

        <!-- 顶栏：指标切换 -->
        <div class="ch-top">
            <div class="ch-chip" @click="back"><text class="ch-chiptxt">返回</text></div>
            <text class="ch-title">{{ metricLabel }}</text>
            <div v-for="(m, mi) in metrics" :key="m.key" :class="metricClass(m)" @click="switchMetric(m)">
                <text :class="metricTxtClass(m)">{{ m.label }}</text>
            </div>
        </div>

        <!-- 图表区：柱状图 -->
        <div class="ch-chart">
            <text v-if="loading" class="ch-empty">加载中…</text>
            <text v-else-if="!bars.length" class="ch-empty">暂无数据，先跑一次测试</text>
            <div v-else class="ch-bars">
                <div v-for="(b, bi) in bars" :key="bi" class="ch-bar" :style="barStyle(b)"></div>
            </div>
        </div>

        <!-- 底部：统计 -->
        <div class="ch-foot">
            <text class="ch-stat">最小 {{ fmt(minVal) }}</text>
            <text class="ch-stat">最大 {{ fmt(maxVal) }}</text>
            <text class="ch-stat">当前 {{ fmt(curVal) }}</text>
            <text class="ch-stat">{{ barCount }} 点</text>
        </div>

    </div>
</template>

<script>
import { parseLog, extractSeries, downsample, normalize, range, fmtVal } from '../../lib/chartdata.js'
import { readText, log } from '../../services/platform.js'

const GRAFANA_DIR = '/userdisk/testlog/grafana'

export default {
    name: 'chart',
    data() {
        return {
            loading: false,
            bars: [],
            minVal: 0,
            maxVal: 0,
            curVal: 0,
            currentKey: 'mem',
            metrics: [
                { key: 'mem', label: '内存', file: 'mem_info.log', field: 'MemFree', desc: '空闲内存' },
                { key: 'temp', label: '温度', file: 'temp_info.log', field: 'battery_temp', desc: '电池温度' },
                { key: 'batt', label: '电池', file: 'battery_info.log', field: 'capacity', desc: '电量' },
                { key: 'cpu', label: 'CPU', file: 'cpu_info.log', field: 'usr', desc: '用户态占用' }
            ]
        }
    },
    computed: {
        currentMetric() {
            for (const m of this.metrics) if (m.key === this.currentKey) return m
            return this.metrics[0]
        },
        metricLabel() {
            return this.currentMetric.desc
        },
        barCount() {
            return this.bars.length
        }
    },
    mounted() {
        log('chart mounted')
        this.load()
    },
    methods: {
        metricClass(m) {
            return m.key === this.currentKey ? 'ch-chip ch-chip-on' : 'ch-chip'
        },
        metricTxtClass(m) {
            return m.key === this.currentKey ? 'ch-chiptxt-on' : 'ch-chiptxt'
        },
        switchMetric(m) {
            if (m.key === this.currentKey) return
            this.currentKey = m.key
            this.load()
        },
        async load() {
            this.loading = true
            const m = this.currentMetric
            const path = GRAFANA_DIR + '/' + m.file
            const text = await readText(path, 1)
            this.loading = false
            if (!text) {
                this.bars = []
                log('chart 无数据 ' + path)
                return
            }
            const records = parseLog(text)
            const series = extractSeries(records, m.field)
            // 降采样到最多 120 点
            const ds = downsample(series, 120)
            const norm = normalize(ds)
            const r = range(ds)
            this.minVal = r.min
            this.maxVal = r.max
            this.curVal = ds.length ? ds[ds.length - 1].value : 0
            this.bars = norm
            log('chart ' + m.key + ' 点=' + ds.length)
        },
        barStyle(b) {
            // 高度按归一化值 0-1 映射到 4-140px
            const h = Math.round(4 + b.value * 140)
            return { height: h + 'px' }
        },
        fmt(v) {
            return fmtVal(v)
        },
        back() {
            // 返回 index 页
            try { $falcon.navTo('index', {}) } catch (e) { /* 忽略 */ }
        }
    }
}
</script>

<style>
.ch-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.ch-top {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.ch-chip {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-right: 8px;
}

.ch-chip-on {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 6px;
    background-color: #4ade80;
    margin-right: 8px;
}

.ch-chiptxt {
    font-size: 13px;
    color: #9a9aa8;
}

.ch-chiptxt-on {
    font-size: 13px;
    color: #0d1a12;
}

.ch-title {
    font-size: 14px;
    color: #e8e8ee;
    flex: 1;
    margin-right: 8px;
}

.ch-chart {
    flex: 1;
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 10px;
    padding-bottom: 10px;
}

.ch-bars {
    flex-direction: row;
    align-items: flex-end;
    flex: 1;
}

.ch-bar {
    width: 5px;
    background-color: #4ade80;
    margin-right: 1px;
}

.ch-empty {
    font-size: 15px;
    color: #6a6a78;
    margin: 20px;
}

.ch-foot {
    height: 36px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.ch-stat {
    font-size: 13px;
    color: #7fd39a;
    margin-right: 16px;
}
</style>
