import { getRequestConfig } from 'next-intl/server'
import en from '../messages/en.json'
import zhCN from '../messages/zh-CN.json'

const messagesByLocale = {
  'zh-CN': zhCN,
  en,
} as const

export default getRequestConfig(async () => {
  const locale = 'zh-CN'

  return {
    locale,
    messages: messagesByLocale[locale],
  }
})
