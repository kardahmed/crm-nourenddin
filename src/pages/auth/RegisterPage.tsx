import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'

export function RegisterPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo-180.png" alt="IMMO PRO-X" className="h-12 w-12" />
          <span className="text-2xl font-bold text-[#0A2540]">IMMO PRO-X</span>
        </div>

        <div className="rounded-2xl border border-[#E3E8EF] bg-white p-8 shadow-lg shadow-black/[0.04]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0579DA]/10">
            <ShieldAlert className="h-7 w-7 text-[#0579DA]" />
          </div>
          <h1 className="text-xl font-bold text-[#0A2540]">{t('register_page.disabled_title')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8898AA]">
            {t('register_page.disabled_subtitle')}
          </p>
          <Link
            to="/login"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#0579DA] text-sm font-bold text-white transition-all hover:bg-[#0460B8] hover:shadow-lg hover:shadow-[#0579DA]/20"
          >
            {t('register_page.sign_in')}
          </Link>
        </div>

        <p className="mt-4 text-center text-[13px] text-[#8898AA]">
          {t('register_page.already_registered')} <Link to="/login" className="font-medium text-[#0579DA] hover:underline">{t('register_page.sign_in')}</Link>
        </p>
      </div>
    </div>
  )
}
