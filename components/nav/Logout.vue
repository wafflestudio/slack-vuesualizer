<script setup lang="ts">
import LogoutIcon from '~icons/mdi/logout'
</script>

<template>
  <a
    class="btn btn-ghost btn-circle"
    href="/oauth2/sign_out"
    :title="$t('logout')"
  >
    <LogoutIcon class="w-6 h-6" />
    <span class="sr-only">{{ $t("logout") }}</span>
  </a>
</template>
