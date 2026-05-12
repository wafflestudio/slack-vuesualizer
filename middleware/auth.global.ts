export default defineNuxtRouteMiddleware((to, _) => {
  const urlToken = to.query.token
  const token = useCookie('mongouuid')
  const localePath = useLocalePath()
  const localeRoute = useLocaleRoute()
  const { demoWorkspaceToken } = useRuntimeConfig().public

  if (typeof urlToken === 'string')
    token.value = urlToken

  if (!token.value && demoWorkspaceToken)
    token.value = demoWorkspaceToken

  if (token.value && to.path === localePath('/'))
    return navigateTo(localeRoute({ name: 'workspace', query: { token: token.value.toString() }} ))

  if (!token.value && to.meta.layout !== 'upload')
    return navigateTo(localeRoute({ name: 'upload' }))
})
