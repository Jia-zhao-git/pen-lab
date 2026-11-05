<template>
    <div class="lg-page">

        <div class="lg-top">
            <div class="lg-chip" @click="back"><text class="lg-chiptxt">返回</text></div>
            <text class="lg-title">日志查看</text>
        </div>

        <!-- 日志源切换 -->
        <div class="lg-sources">
            <div v-for="(s, si) in sources" :key="s.key" :class="sourceClass(s)" @click="switchSource(s)">
                <text :class="sourceTxtClass(s)">{{ s.label }}</text>
            </div>
        </div>

        <!-- 统计 + 过滤 -->
        <div class="lg-stats">
            <text class="lg-stat">错误 {{ stats.error }}</text>
            <text class="lg-stat">崩溃 {{ stats.crash }}</text>
            <text class="lg-stat">失败 {{ stats.fail }}</text>
            <text class="lg-stat">OOM {{ stats.oom }}</text>
        </div>

        <!-- 日志内容 -->
        <scroller class="lg-scroll" scroll-direction="vertical">
            <div class="lg-content">
                <text v-if="loading" class="lg-empty">加载中…</text>
                <text v-else-if="!logText" class="lg-empty">无日志（该源可能没有数据）</text>
                <text v-else class="lg-text">{{ logText }}</text>
            </div>
        </scroller>

    </div>
</template>

<script>
import { LOG_SOURCES, resolveDynamicPath, readLogTail, countKeywords } from '../../services/logs.js'
import { log } from '../../services/platform.js'

export default {
    name: 'logs',
    data() {
        return {
            sources: LOG_SOURCES,
            currentKey: 'system',
            logText: '',
            stats: { error: 0, crash: 0, fail: 0, oom: 0 },
            loading: false
        }
    },
    mounted() {
        log('logs mounted')
        this.load()
    },
    methods: {
        sourceClass(s) {
            return s.key === this.currentKey ? 'lg-src lg-src-on' : 'lg-src'
        },
        sourceTxtClass(s) {
            return s.key === this.currentKey ? 'lg-srctxt-on' : 'lg-srctxt'
        },
        switchSource(s) {
            if (s.key === this.currentKey) return
            this.currentKey = s.key
            this.load()
        },
        async load() {
            this.loading = true
            const src = this.sources.find((s) => s.key === this.currentKey)
            let path = src.path
            if (src.dynamic) {
                path = await resolveDynamicPath(src.key)
            }
            const text = await readLogTail(path, 300)
            this.logText = text
            this.stats = countKeywords(text)
            this.loading = false
            log('logs ' + this.currentKey + ' 读 ' + (text ? text.length : 0) + ' 字符')
        },
        back() {
            try { $falcon.navTo('index', {}) } catch (e) { /* 忽略 */ }
        }
    }
}
</script>

<style>
.lg-page {
    width: 936px;
    height: 280px;
    flex-direction: column;
    background-color: #16161a;
    position: relative;
}

.lg-top {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1e1e24;
}

.lg-chip {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 12px;
    padding-right: 12px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-right: 10px;
}

.lg-chiptxt {
    font-size: 13px;
    color: #9a9aa8;
}

.lg-title {
    font-size: 16px;
    color: #e8e8ee;
    flex: 1;
}

.lg-sources {
    height: 40px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1c1c22;
}

.lg-src {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 6px;
    background-color: #2a2a33;
    margin-right: 6px;
}

.lg-src-on {
    flex-direction: row;
    align-items: center;
    height: 26px;
    padding-left: 10px;
    padding-right: 10px;
    border-radius: 6px;
    background-color: #4ade80;
    margin-right: 6px;
}

.lg-srctxt {
    font-size: 13px;
    color: #9a9aa8;
}

.lg-srctxt-on {
    font-size: 13px;
    color: #0d1a12;
}

.lg-stats {
    height: 28px;
    flex-direction: row;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
    background-color: #1a1a20;
}

.lg-stat {
    font-size: 12px;
    color: #f0b866;
    margin-right: 16px;
}

.lg-scroll {
    flex: 1;
}

.lg-content {
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 6px;
    padding-bottom: 6px;
}

.lg-text {
    font-size: 12px;
    color: #b8b8c8;
}

.lg-empty {
    font-size: 14px;
    color: #6a6a78;
    margin: 20px;
}
</style>
