import type { Message } from '~/types/Message'
import { Sortable } from '~/types/Sort'

export function useSearch(currentChannel: Ref<string | string[]>) {
  const searching = ref(false)
  const loadingMore = ref(false)
  const results = ref<Message[]>([])
  const query = ref('')
  const allChannels = ref(false)
  const regex = ref(true)
  const sender = ref('')
  const fromDate = ref('')
  const toDate = ref('')
  const sort = ref<Sortable>(Sortable.Newest)
  const page = ref(0)
  const hasMore = ref(false)

  const PAGE_SIZE = 30

  const buildQueryParams = () => {
    const queryParams: {
      query: string
      channel?: string | string[]
      regex?: string
      sender?: string
      fromDate?: string
      toDate?: string
      sort?: string
      page?: string
      size?: string
    } = {
      query: query.value,
      page: String(page.value),
      size: String(PAGE_SIZE),
    }

    if (!allChannels.value && currentChannel.value)
      queryParams.channel = currentChannel.value

    if (regex.value)
      queryParams.regex = 'true'

    if (sender.value)
      queryParams.sender = sender.value

    if (fromDate.value)
      queryParams.fromDate = fromDate.value

    if (toDate.value)
      queryParams.toDate = toDate.value

    if (sort.value)
      queryParams.sort = sort.value

    return queryParams
  }

  const fetchResults = async (append: boolean) => {
    if (!query.value)
      return

    if (append && (!hasMore.value || loadingMore.value || searching.value))
      return

    if (append)
      loadingMore.value = true
    else
      searching.value = true

    const nextPage = append ? page.value + 1 : 0

    try {
      const queryParams = {
        ...buildQueryParams(),
        page: String(nextPage),
      }

      const newResults = await $fetch<Message[]>('/api/messages/search', {
        query: queryParams,
        headers: useRequestHeaders(['cookie']),
      })

      results.value = append ? [...results.value, ...newResults] : newResults
      page.value = nextPage
      hasMore.value = newResults.length === PAGE_SIZE
    }
    catch (e) {
      console.error(e)
      hasMore.value = false
    }
    finally {
      searching.value = false
      loadingMore.value = false
    }
  }

  const search = useDebounceFn(async () => {
    page.value = 0
    results.value = []
    hasMore.value = false
    await fetchResults(false)
  }, 500)

  watch([query, allChannels, regex, sender, fromDate, toDate, sort], () => {
    if (!query.value) {
      results.value = []
      page.value = 0
      hasMore.value = false
      return
    }
    page.value = 0
    results.value = []
    hasMore.value = false
    return search()
  })

  whenever(
    () => !currentChannel.value,
    () => {
      allChannels.value = true
    },
    { immediate: true },
  )

  return {
    allChannels,
    query,
    regex,
    sender,
    fromDate,
    toDate,
    sort,
    results,
    hasMore,
    searching: readonly(searching),
    loadingMore: readonly(loadingMore),
    search,
    loadMore: () => fetchResults(true),
  }
}
