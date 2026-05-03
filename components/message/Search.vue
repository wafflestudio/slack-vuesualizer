<script lang="ts" setup>
import { onKeyDown, useIntersectionObserver } from '@vueuse/core'
import LoadingSpinner from '~icons/line-md/loading-alt-loop'
import CloseIcon from '~icons/line-md/close'
import TextSearch from '~icons/mdi/text-search'

const route = useRoute()

const channel = computed(() => route.params.channel)
const users = useUsers()

const {
  searching: _searching,
  allChannels,
  query,
  regex,
  sender,
  fromDate,
  toDate,
  sort,
  results,
  hasMore,
  loadingMore,
  loadMore,
} = useSearch(channel)

provide('searchQuery', query)
provide('searchRegex', regex)

const searching = refDebounced(_searching, 150)

whenever(
  () => !route.params.channel,
  () => {
    allChannels.value = true
  },
  { immediate: true },
)

const wrapper = ref<HTMLElement | null>(null)
const resultsArea = ref<HTMLElement | null>(null)
const moreSentinel = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const visible = ref(false)

whenever(
  () => visible && input,
  () => {
    unrefElement(input)?.focus()
  },
)

onClickOutside(wrapper, () => (visible.value = false), {
  ignore: [input],
})

const keys = useMagicKeys()

const ctrlK = keys['Ctrl+K']

whenever(ctrlK, () => {
  visible.value = true
})

onKeyDown(['Escape'], (e) => {
  e.preventDefault()
  visible.value = false
})

useIntersectionObserver(
  moreSentinel,
  ([entry]) => {
    if (entry?.isIntersecting && hasMore.value && !searching.value && !loadingMore.value)
      loadMore()
  },
  {
    root: resultsArea,
    threshold: 0.1,
  },
)
</script>

<template>
  <div class="w-full max-w-xl">
    <div>
      <Transition name="fade" mode="out-in">
        <div v-if="visible" class="relative w-full">
          <input
            ref="input"
            v-model="query"
            type="text"
            :placeholder="$t('search.messages')"
            class="w-full input font-mono pr-14"
            autofocus
          >
          <button
            class="btn btn-circle btn-ghost absolute right-0"
            :title="$t('close')"
            @click="visible = false"
          >
            <CloseIcon class="w-6 h-6" />
          </button>
        </div>
        <button
          v-else
          class="btn btn-outline btn-block gap-4"
          @click="visible = true"
        >
          <TextSearch class="w-6 h-6" />
          <span class="font-mono">{{ $t("search.messages") }}</span>
          <div class="hidden md:inline-block">
            <kbd class="kbd text-base-content">Ctrl</kbd>
            +
            <kbd class="kbd text-base-content">K</kbd>
          </div>
        </button>
      </Transition>
      <Transition name="slide-y">
        <div
          v-if="visible"
          class="px-2 pb-2 bg-base-100 lg:border-x border-slate-800/10 dark:border-slate-100/25 absolute top-16 h-[calc(100vh-4rem)] inset-x-0"
        >
          <div ref="wrapper" class="max-w-xl mx-auto h-full flex flex-col">
            <div class="mb-2">
              <i18n-t
                keypath="search.results"
                tag="h3"
                class="capitalize font-medium text-lg flex-1"
                scope="global"
              >
                <span class="font-bold normal-case">"{{ query }}"</span>
                <span>{{
                  $t(
                    "search.channelresults",
                    [route.params.channel],
                    allChannels ? 2 : 1,
                  )
                }}</span>
              </i18n-t>
              <div class="form-control">
                <label class="max-w-max label cursor-pointer">
                  <input
                    v-model="allChannels"
                    type="checkbox"
                    class="checkbox"
                    :disabled="!route.params.channel"
                  >
                  <span
                    class="capitalize font-mono font-medium label-text whitespace-nowrap ml-4"
                  >
                    {{ $t("search.everywhere") }}
                  </span>
                </label>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-mono text-xs">{{ $t("search.sender") }}</span>
                  <select v-model="sender" class="select select-bordered select-sm w-full">
                    <option value="">
                      {{ $t("search.anySender") }}
                    </option>
                    <option v-for="user in users" :key="user.id" :value="user.id">
                      {{ useUserName(user) }}
                    </option>
                  </select>
                </label>
                <label class="max-w-max label cursor-pointer md:self-end">
                  <input
                    v-model="regex"
                    type="checkbox"
                    class="checkbox checkbox-sm"
                  >
                  <span
                    class="capitalize font-mono font-medium label-text whitespace-nowrap ml-3"
                  >
                    {{ $t("search.regex") }}
                  </span>
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-mono text-xs">{{ $t("search.fromDate") }}</span>
                  <input
                    v-model="fromDate"
                    type="date"
                    class="input input-bordered input-sm w-full"
                  >
                </label>
                <label class="form-control w-full">
                  <span class="label-text mb-1 font-mono text-xs">{{ $t("search.toDate") }}</span>
                  <input
                    v-model="toDate"
                    type="date"
                    class="input input-bordered input-sm w-full"
                  >
                </label>
                <label class="form-control w-full md:col-span-2">
                  <span class="label-text mb-1 font-mono text-xs">{{ $t("filter.sort") }}</span>
                  <BaseSort v-model="sort" />
                </label>
              </div>
            </div>
            <Transition name="fade" mode="out-in">
              <div
                v-if="searching"
                class="p-2 bg-base-100 w-full h-full flex justify-center mt-8"
              >
                <LoadingSpinner class="w-12 h-12" />
              </div>
              <div
                v-else
                ref="resultsArea"
                class="min-h-0 overflow-auto flex-1"
              >
                <MessageResults
                  :results="results"
                  @close="visible = false"
                />
                <div ref="moreSentinel" class="py-4 flex justify-center">
                  <LoadingSpinner v-if="loadingMore" class="w-8 h-8" />
                  <span v-else-if="hasMore" class="text-sm text-base-content/60">
                    {{ $t("search.scrollMore") }}
                  </span>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
