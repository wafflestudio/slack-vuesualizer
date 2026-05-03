import type { Ref } from 'vue'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function useHighlight() {
  const query = inject<Ref<string>>('searchQuery', ref(''))
  const isRegex = inject<Ref<boolean>>('searchRegex', ref(false))

  function highlight(text: string): string {
    const q = query.value
    if (!q || !text)
      return escapeHtml(text)

    let pattern: RegExp
    try {
      pattern = isRegex.value
        ? new RegExp(`(${q})`, 'gi')
        : new RegExp(`(${escapeRegex(q)})`, 'gi')
    }
    catch {
      return escapeHtml(text)
    }

    const parts = text.split(pattern)
    return parts.map((part, i) =>
      i % 2 === 1
        ? `<mark class="bg-yellow-200 dark:bg-yellow-600 rounded px-0.5">${escapeHtml(part)}</mark>`
        : escapeHtml(part),
    ).join('')
  }

  return { highlight }
}
