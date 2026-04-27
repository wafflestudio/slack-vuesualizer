<script lang="ts" setup>
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import type { Message } from '~~/types/Message.js'

interface Props {
  messages: Message[]
  hasMore?: boolean
  loadingMore?: boolean
}

interface Emits {
  (event: 'load-more'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { withSeparators } = useMessages(() => props.messages)
const scroller = ref<any>(null)
const route = useRoute()
const previousStartIndex = ref<number | null>(null)
const pendingAnchorId = ref<string | null>(null)
const hasInitializedScroll = ref(false)

const messageId = computed(() => route.query.message)

const findAnchorMessageId = (startIndex: number) => {
  for (let i = startIndex; i < withSeparators.value.items.length; i += 1) {
    const item = withSeparators.value.items[i]
    if (!('date' in item))
      return item._id as string
  }
  return null
}

const handleNearTop = (startIndex: number) => {
  if (!props.hasMore || props.loadingMore)
    return

  const prefetchThreshold = 6
  const movedUp = previousStartIndex.value !== null && startIndex < previousStartIndex.value
  if (movedUp && startIndex <= prefetchThreshold) {
    pendingAnchorId.value = findAnchorMessageId(startIndex)
    emit('load-more')
  }
}

const onScrollerUpdate = (startIndex: number) => {
  handleNearTop(startIndex)
  previousStartIndex.value = startIndex
}

watch(
  () => props.loadingMore,
  (loading) => {
    if (loading || !pendingAnchorId.value)
      return

    const index = withSeparators.value.items.findIndex(
      item => !('date' in item) && item._id === pendingAnchorId.value,
    )

    if (index >= 0)
      setTimeout(() => scroller.value?.scrollToItem(index), 0)

    pendingAnchorId.value = null
  },
)

watchEffect(() => {
  if (messageId.value) {
    const index = withSeparators.value.items.findIndex(
      message => '_id' in message && message._id === messageId.value,
    )
    if (index >= 0)
      setTimeout(() => scroller.value?.scrollToItem(index), 0)
  }
})

onMounted(() => {
  const tryScrollToBottom = () => {
    if (!scroller.value || withSeparators.value.items.length === 0)
      return

    const el = scroller.value.$el as HTMLElement | undefined
    if (!el)
      return

    const lastIndex = withSeparators.value.items.length - 1
    scroller.value.scrollToItem(lastIndex)

    setTimeout(() => {
      el.scrollTop = el.scrollHeight
      hasInitializedScroll.value = true
    }, 16)
  }

  nextTick(() => {
    setTimeout(tryScrollToBottom, 0)
  })
})
</script>

<template>
  <DynamicScroller
    ref="scroller"
    class="h-full"
    :emit-update="true"
    @update="onScrollerUpdate"
    :items="withSeparators.items"
    :min-item-size="64"
    key-field="_id"
  >
    <template #default="{ item, index, active }">
      <DynamicScrollerItem
        :item="item"
        :active="active"
        :size-dependencies="[
          item.files,
          item.text,
          item.blocks,
          item.reactions,
          item.last_reply,
        ]"
        :data-index="index"
      >
        <div v-if="item.date" class="divider font-mono text-sm my-2 px-4">
          {{ $d(item.date, "short") }}
        </div>
        <MessageItem
          v-else
          :message="item"
          :searched="messageId === item._id"
        />
      </DynamicScrollerItem>
    </template>
  </DynamicScroller>
</template>
