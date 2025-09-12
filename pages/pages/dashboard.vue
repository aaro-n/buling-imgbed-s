<template>
    <div class="dashboard">
        <h1 class="dashboard-title">后台管理</h1>

        <div class="dashboard-grid">
            <!-- 个人资料卡片 -->
            <div class="dashboard-card" @click="navigateTo('/profile')">
                <div class="card-content">
                    <h2>个人资料</h2>
                    <p>管理您的账户信息</p>
                </div>
            </div>
            <!-- 图片管理卡片 -->
            <div class="dashboard-card" @click="navigateTo('/images')">
                <div class="card-content">
                    <h2>图片管理</h2>
                    <p>管理您的图片列表</p>
                </div>
            </div>


        </div>
    </div>
</template>

<script setup>
definePageMeta({
    middleware: 'auth'
})
</script>

<style scoped>
.dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
}

.dashboard-title {
    margin-bottom: 2rem;
    color: var(--text-color);
    font-size: 1.8rem;
}

.dashboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.dashboard-card {
    background-color: var(--card-background);
    border-radius: 8px;
    padding: 2rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 4px var(--shadow-color);
}

.dashboard-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px var(--shadow-color);
}

.card-content h2 {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-color);
    margin-bottom: 0.5rem;
}

.card-content p {
    margin: 0;
    color: var(--text-color-light);
    font-size: 0.9rem;
}
</style>