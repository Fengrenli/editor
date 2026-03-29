import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

function BulletList({ items }: { items: string }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-foreground/90">
      {items
        .split('\n')
        .filter(Boolean)
        .map((line) => (
          <li key={line}>{line}</li>
        ))}
    </ul>
  )
}

const emailLinkClass = 'text-foreground underline hover:text-foreground/80'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('staticLegal.privacy')
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function PrivacyPage() {
  const nav = await getTranslations('staticLegal.nav')
  const t = await getTranslations('staticLegal.privacy')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center gap-4 text-sm">
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/"
            >
              {nav('home')}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/terms"
            >
              {nav('terms')}
            </Link>
            <span className="text-muted-foreground">|</span>
            <span className="font-medium text-foreground">{nav('privacy')}</span>
          </nav>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-6 py-12">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1 className="mb-2 font-bold text-3xl">{t('title')}</h1>
          <p className="mb-8 text-muted-foreground text-sm">{t('effective')}</p>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s1h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s1p')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s2h')}</h2>

            <h3 className="mt-4 font-medium text-lg">{t('s2accountH')}</h3>
            <p className="text-foreground/90 leading-relaxed">{t('s2accountIntro')}</p>
            <BulletList items={t('s2accountList')} />

            <h3 className="mt-4 font-medium text-lg">{t('s2projectH')}</h3>
            <p className="text-foreground/90 leading-relaxed">{t('s2projectP')}</p>

            <h3 className="mt-4 font-medium text-lg">{t('s2analyticsH')}</h3>
            <p className="text-foreground/90 leading-relaxed">{t('s2analyticsP')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s3h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s3intro')}</p>
            <BulletList items={t('s3list')} />
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s4h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s4p')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s5h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s5intro')}</p>
            <BulletList items={t('s5list')} />
            <p className="mt-4 text-foreground/90 leading-relaxed">{t('s5footer')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s6h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s6intro')}</p>
            <BulletList items={t('s6list')} />
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s7h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s7intro')}</p>
            <BulletList items={t('s7list')} />
            <p className="mt-4 text-foreground/90 leading-relaxed">
              {t.rich('s7contact', {
                email: (chunks) => (
                  <a className={emailLinkClass} href="mailto:support@pascal.app">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s8h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s8p')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s9h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s9p')}</p>
          </section>

          <section className="mb-8 space-y-4">
            <h2 className="font-semibold text-xl">{t('s10h')}</h2>
            <p className="text-foreground/90 leading-relaxed">{t('s10p')}</p>
          </section>

          <section className="space-y-4">
            <h2 className="font-semibold text-xl">{t('s11h')}</h2>
            <p className="text-foreground/90 leading-relaxed">
              {t.rich('s11contact', {
                email: (chunks) => (
                  <a className={emailLinkClass} href="mailto:support@pascal.app">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
