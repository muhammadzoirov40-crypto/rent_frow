import { Link } from 'react-router-dom'
import Logo from '../Logo'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Globe, MessageCircle, Send } from 'lucide-react'

// The mockup puts the social row at the very foot of the page, under the
// copyright line — not tucked inside the first column. Same three links.
const SOCIALS = [
  { key: 'globe', Icon: Globe },
  { key: 'chat', Icon: MessageCircle },
  { key: 'send', Icon: Send },
] as const

export default function Footer() {
  const { t } = useTranslation()

  const CATEGORIES = [
    { label: t('nav.equipment'), to: '/search' },
    { label: t('nav.favorites'), to: '/favorites' },
    { label: t('nav.messages'), to: '/messages' },
    { label: t('nav.rentalRequests'), to: '/rental-requests' },
    { label: t('nav.myRentals'), to: '/my-rentals' },
    { label: t('nav.settings'), to: '/settings' },
  ]

  const CITIES = [
    { label: 'Душанбе', to: '/search?city=1' },
    { label: 'Худжанд', to: '/search?city=2' },
    { label: 'Бохтар', to: '/search?city=3' },
    { label: 'Куляб', to: '/search?city=4' },
    { label: 'Истаравшан', to: '/search?city=5' },
    { label: 'Турсунзаде', to: '/search?city=6' },
  ]

  return (
    <footer className="glass-section text-gray-600 dark:text-gray-300 border-t border-gray-200/70 dark:border-white/10 pb-20 md:pb-0">
      {/* pb-20 on mobile: the fixed bottom nav floats over the last ~62px,
          and without this pad the copyright row and its Terms/Privacy links
          sit underneath it where a thumb can never reach them. Desktop has
          no bottom nav, so the pad goes away at md. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        {/* Two columns on a phone (the mockup's rhythm), four on a laptop:
            the menu and the cities read as a pair, and the wide blocks —
            the blurb and the contact list — span the full row above and
            below them so nothing gets squeezed into a half-width strip. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 lg:gap-x-8 gap-y-7">
          <div className="col-span-2 lg:col-span-1">
            <div className="mb-3 inline-block"><Logo size="sm" /></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('footer.aboutText')}
            </p>
          </div>

          <div>
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wide mb-3">{t('footer.categories')}</h4>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.to}>
                  <Link to={cat.to} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] transition">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wide mb-3">{t('footer.cities')}</h4>
            <ul className="space-y-2">
              {CITIES.map((city) => (
                <li key={city.to}>
                  <Link to={city.to} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[var(--accent)] transition">
                    {city.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wide mb-3">{t('footer.contact')}</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                +992 (002) 119-831
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                {/* min-w-0 + break-all: a long unbroken address must wrap
                    inside its column instead of widening the whole footer */}
                <span className="min-w-0 break-all">muhammadzoirov40@gmail.com</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>г. Душанбе, район Сино, мкр. Арбобхутун-3</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} RentHub. {t('footer.copyright')}.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/terms" className="hover:text-gray-300 transition">{t('footer.terms')}</Link>
            <Link to="/privacy" className="hover:text-gray-300 transition">{t('footer.privacy')}</Link>
          </div>
        </div>
        {/* The social row sits on the last line, as in the mockup: a thumb
            scrolling to the foot of the page finds the ways to reach us
            right there, beside the copyright. */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-5 flex items-center justify-center gap-3">
          {SOCIALS.map(({ key, Icon }) => (
            <a
              key={key}
              href="#"
              className="w-9 h-9 rounded-xl glass-section flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-brand-500 hover:text-white transition"
            >
              <Icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
