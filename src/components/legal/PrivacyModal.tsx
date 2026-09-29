import React, { useEffect } from 'react';
import { Lock, X, Check, ShieldCheck } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-800">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Политика конфиденциальности
              </h2>
              <p className="text-xs text-slate-500">
                Правила обработки персональных данных в соответствии с ФЗ № 152-ФЗ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Закрыть (Esc)"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs leading-relaxed text-slate-700">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-[11px] text-blue-950">
            <p className="font-bold">Безопасность ваших данных — приоритет сервиса DOSKA:</p>
            <p className="mt-1">
              Настоящая Политика регламентирует порядок обработки и обеспечения безопасности персональных данных пользователей сервиса «DOSKA» (интерактивная онлайн-доска для преподавателей)
              в строгом соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных».
            </p>
          </div>

          <section>
            <h3 className="text-sm font-bold text-slate-900">1. Оператор персональных данных</h3>
            <p className="mt-1">
              1.1. Оператором персональных данных является Самозанятый гражданин Вайнбергер Иван Юрьевич (ИНН: 66520743874,
              email: vainbergerivan0608@gmail.com).
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">2. Состав и категории обрабатываемых данных</h3>
            <p className="mt-1">
              2.1. Сервис обрабатывает только минимально необходимый объем данных:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Адрес электронной почты (Email) — используется как уникальный логин пользователя.</li>
              <li>Имя преподавателя — для отображения в личном кабинете и на досках.</li>
              <li>Хэшированный пароль — пароли шифруются криптографическим алгоритмом bcrypt (пароли в открытом виде не хранятся).</li>
              <li>Технические метаданные — дата регистрации, статус подписки (FREE/PRO), количество созданных досок.</li>
            </ul>
            <p className="mt-2 text-emerald-800 font-semibold">
              2.2. Защита платежной информации: Сервис DOSKA НИКОГДА не запрашивает, не обрабатывает и не сохраняет данные банковских карт,
              CVC/CVV-коды и пин-коды. Ввод платежных данных происходит на защищенной платежной форме процессингового центра ООО НКО «ЮМани» (ЮKassa),
              сертифицированной по наивысшему уровню стандарта PCI DSS.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">3. Цели обработки данных</h3>
            <p className="mt-1">
              3.1. Идентификация Пользователя в рамках соглашения и предоставление доступа к интерактивной онлайн-доске.
            </p>
            <p className="mt-1">
              3.2. Обеспечение сохранности созданных учебных материалов, досок и чертежей.
            </p>
            <p className="mt-1">
              3.3. Уведомление о статусе подписки, технических обновлениях сервиса и ответах службы поддержки.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">4. Порядок хранения и передачи данных</h3>
            <p className="mt-1">
              4.1. Персональные данные хранятся на защищенных серверах, расположенных на территории Российской Федерации (в соответствии с требованиями 242-ФЗ).
            </p>
            <p className="mt-1">
              4.2. Передача данных третьим лицам исключена, за исключением случаев, прямо предусмотренных действующим законодательством РФ,
              а также взаимодействия с платежным шлюзом ЮKassa исключительно в объеме, необходимом для проведения транзакции.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">5. Права субъекта данных и удаление</h3>
            <p className="mt-1">
              5.1. Пользователь вправе в любой момент отозвать согласие на обработку персональных данных или запросить удаление своего аккаунта и досок,
              направив письменный запрос на адрес электронной почты: <strong>vainbergerivan0608@gmail.com</strong>. Запрос исполняется в течение 72 часов.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800">
            <ShieldCheck className="h-4 w-4" />
            <span>Соответствует ФЗ № 152-ФЗ «О персональных данных»</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-900 active:scale-95"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>Закрыть</span>
          </button>
        </div>
      </div>
    </div>
  );
};
