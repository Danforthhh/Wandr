import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en') ?? true;

  const toggle = () => {
    const next = isEn ? 'fr' : 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
      title={isEn ? 'Passer en français' : 'Switch to English'}
    >
      <span className={isEn ? 'text-gray-200' : 'text-gray-500'}>EN</span>
      <span className="text-gray-600">|</span>
      <span className={!isEn ? 'text-gray-200' : 'text-gray-500'}>FR</span>
    </button>
  );
}
