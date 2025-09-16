<template>
    <button class="theme-toggle" @click="toggleTheme">
        <span v-if="theme === 'light'">🌛</span>
        <span v-else>🌞</span>
    </button>
</template>
<script setup>
const { theme, toggleTheme } = useTheme()
</script>
<style scoped>
.theme-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.5rem;
    padding: 0.5rem;
    border-radius: 50%;
    transition: background-color 0.3s;
}

.theme-toggle:hover {
    background-color: var(--card-background);
}
</style>