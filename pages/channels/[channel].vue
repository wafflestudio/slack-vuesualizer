<script lang="ts" setup>
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import type { Message } from '~/types/Message';

const route = useRoute()

const channelId = computed(() => route.params.channel as string)

const { typeById } = useChannels()

const channelType = computed(() => typeById(channelId.value))

const PAGE_SIZE = 100

interface MessagesResponse {
  messages: Message[]
  hasMore: boolean
  total: number
}

const { data: channel } = await useFetch(
  `/api/${channelType.value}/${channelId.value}`,
  {
    headers: useRequestHeaders(['cookie']),
  },
)

const messages = ref<Message[]>([])
const hasMore = ref(false)
const loadingMore = ref(false)
const currentPage = ref(0)
const messageCount = ref(0)
const syncingToTarget = ref(false)

const { data: firstPage, pending } = await useLazyFetch<MessagesResponse>(
  `/api/channels/${unref(channelId)}/messages`,
  {
    query: {
      page: 0,
      size: PAGE_SIZE,
    },
    headers: useRequestHeaders(['cookie']),
  },
)

watchEffect(() => {
  if (!firstPage.value)
    return

  messages.value = firstPage.value.messages
  hasMore.value = firstPage.value.hasMore
  currentPage.value = 1
  messageCount.value = firstPage.value.total
})

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value)
    return

  loadingMore.value = true

  try {
    const nextPage = await $fetch<MessagesResponse>(`/api/channels/${unref(channelId)}/messages`, {
      query: {
        page: currentPage.value,
        size: PAGE_SIZE,
      },
      headers: useRequestHeaders(['cookie']),
    })

    messages.value = [...nextPage.messages, ...messages.value]
    hasMore.value = nextPage.hasMore
    currentPage.value += 1
  }
  finally {
    loadingMore.value = false
  }
}

const { withUsernames } = useWithUsernames()

const name = computed(() => {
  if (!channel.value) {
    return ""
  }

  switch (channelType.value) {
    case 'channels':
    case 'groups':
      return channel.value.name
    case 'mpims':
    case 'dms':
      return withUsernames(channel.value.members).memberString
  }
})
const date = ref<Date>()
const toDate = useTsToDate()
const colorMode = useColorMode()

const localeRoute = useLocaleRoute()

const routeMessageId = computed(() => route.query.message?.toString())

watchEffect(async () => {
  if (!routeMessageId.value || pending.value || syncingToTarget.value)
    return

  syncingToTarget.value = true

  try {
    while (hasMore.value && !messages.value.some(m => m._id === routeMessageId.value))
      await loadMore()
  }
  finally {
    syncingToTarget.value = false
  }
})

whenever(date, (d) => {
  const message = messages.value.find(m => d < (toDate(m.ts) ?? 0)) ?? messages.value.at(-1)
  if (message) {
    navigateTo(localeRoute({
      path: route.path,
      query: { ...route.query, message: message._id },
    }))
  }
})
</script>

<template>
  <section class="flex flex-col h-full w-full max-w-xl">
    <div class="my-2 md:my-4 flex flex-col gap-2">
      <ChannelHeader v-if="channel" class="flex-1" v-bind="channel" :name :messages="messageCount || messages.length" />
      <Datepicker v-model="date" :dark="colorMode.value === 'business'" :placeholder="$t('jumpToDate')"
        :start-date="toDate(messages?.at(-1)?.ts)" :min-date="toDate(messages?.[0]?.ts)"
        :max-date="toDate(messages?.at(-1)?.ts)" />
    </div>
    <div v-if="pending" class="flex flex-col gap-4 overflow-y-hidden">
      <MessageSkeleton v-for="i in [1, 2, 3, 4, 5, 6, 7]" :key="i" class="shrink-0" />
    </div>
    <MessageList
      v-else-if="messages.length"
      :messages="messages"
      :has-more="hasMore"
      :loading-more="loadingMore"
      @load-more="loadMore"
    />
    <div v-else class="text-xl text-center">
      {{ $t('channel.empty') }}
    </div>
  </section>
</template>
