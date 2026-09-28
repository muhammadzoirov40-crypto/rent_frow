import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Phone, MapPin, Globe, MessageCircle, Send, Download, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const APK_URL = 'https://renthub.qobus.tj/app/RentHub.apk'

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
    <footer className="bg-white dark:bg-[#0a0a1a] text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold text-[#1A1A2E] dark:text-white">RentHub</span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('footer.aboutText')}
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white transition">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white transition">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-brand-500 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-white transition">
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.categories')}</h4>
            <ul className="space-y-2.5">
              {CATEGORIES.map((cat) => (
                <li key={cat.to}>
                  <Link to={cat.to} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] transition">
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.cities')}</h4>
            <ul className="space-y-2.5">
              {CITIES.map((city) => (
                <li key={city.to}>
                  <Link to={city.to} className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#FF6B35] transition">
                    {city.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wider mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                +992 (002) 119-831
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                muhammadzoirov40@gmail.com
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span>г. Душанбе, район Сино, мкр. Арбобхутун-3</span>
              </li>
            </ul>

            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-white/10">
              <div className="rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <h4 className="text-[#1A1A2E] dark:text-white font-semibold text-sm uppercase tracking-wider">
                    {t('footer.mobileApp')}
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <a
                    href={APK_URL}
                    download
                    aria-label={t('footer.downloadApp')}
                    className="shrink-0 bg-white rounded-xl p-2 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-brand-500 transition"
                  >
                    <QRCodeSVG value={APK_URL} size={96} />
                  </a>
                  <div className="w-full sm:flex-1 sm:min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                      {t('footer.scanHint')}
                    </p>
                    <a
                      href={APK_URL}
                      download
                      className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('footer.downloadApp')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} RentHub. {t('footer.copyright')}.
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
