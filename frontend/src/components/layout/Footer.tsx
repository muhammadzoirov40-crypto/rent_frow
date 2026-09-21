import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Globe, MessageCircle, Send } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()

  const CATEGORIES = [
    { label: t('nav.equipment'), to: '/search' },
    { label: t('nav.favorites'), to: '/favorites' },
    { label: t('nav.messages'), to: '/messages' },
    { label: t('nav.rentalRequests'), to: '/rental-requests' },
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
    <footer className="bg-navy-800 dark:bg-[#0a0a1a] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold text-white">RentFlow</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t('footer.aboutText')}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-400 hover:text-white transition">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-400 hover:text-white transition">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-400 hover:text-white transition">
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.categories')}</h4>
            <ul className="space-y-2.5">
              {CATEGORIES.map((cat) => (
                <li key={cat.to}>
                  <Link to={cat.to} className="text-sm text-gray-400 hover:text-brand-400 transition">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.cities')}</h4>
            <ul className="space-y-2.5">
              {CITIES.map((city) => (
                <li key={city.to}>
                  <Link to={city.to} className="text-sm text-gray-400 hover:text-brand-400 transition">
                    {city.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                +992 (900) 123-456
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                info@rentflow.tj
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>г. Душанбе, ул. Рудаки 45</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} RentFlow. {t('footer.copyright')}.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/terms" className="hover:text-gray-300 transition">{t('footer.terms')}</Link>
            <Link to="/privacy" className="hover:text-gray-300 transition">{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
