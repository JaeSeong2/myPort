import { PageTitle } from '../../../components/common/FormControls'
import { useLanguage } from '../../../context/LanguageContext'

export default function StatusPage() {
  const { t } = useLanguage()
  return (
    <div className="p-6 flex flex-col gap-4">
      <PageTitle title={t('menu.settings')} />
      <p className="text-muted text-sm">{t('msg.wip')}</p>
    </div>
  )
}
