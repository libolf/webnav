<script setup>
import SearchBox from '@/components/SearchBox.vue'
import NavGrid from '@/components/NavGrid.vue'
import { onMounted } from 'vue'
import { store } from '@/utils/store.js'

onMounted(() => {
  store.loginAndFetch('qwe')
})

</script>

<template>
  <SearchBox />
  <NavGrid />
</template>

<style scoped></style>
