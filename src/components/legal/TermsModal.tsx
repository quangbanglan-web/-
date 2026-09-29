import React, { useEffect } from 'react';
import { FileText, X, Check, ShieldCheck, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
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
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                Публичная оферта на оказание услуг
              </h2>
              <p className="text-xs text-slate-500">
                Договор-оферта на предоставление подписки «DOSKA PRO»
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

        {/* Legal Text Content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-xs leading-relaxed text-slate-700">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-[11px] text-emerald-950">
            <p className="font-bold">Краткая информация о договоре:</p>
            <p className="mt-1">
              Настоящий документ является официальным предложением (публичной офертой в соответствии со ст. 437 ГК РФ)
              Самозанятого гражданина Вайнбергера Ивана Юрьевича (плательщика НПД) заключить договор на предоставление
              информационного онлайн-доступа к сервису интерактивной онлайн-доски «DOSKA» на условиях ежемесячной автоподписки за 99 руб./мес.
            </p>
          </div>

          <section>
            <h3 className="text-sm font-bold text-slate-900">1. Термины и определения</h3>
            <p className="mt-1">
              <strong>1.1. Исполнитель</strong> — Самозанятый гражданин Вайнбергер Иван Юрьевич (ИНН: 66520743874),
              применяющий специальный налоговый режим «Налог на профессиональный доход» (ФЗ № 422-ФЗ).
            </p>
            <p className="mt-1">
              <strong>1.2. Заказчик (Пользователь)</strong> — дееспособное физическое лицо, осуществившее акцепт настоящей
              оферты путем прохождения регистрации и/или совершения оплаты подписки.
            </p>
            <p className="mt-1">
              <strong>1.3. Сервис (Платформа)</strong> — программный комплекс интерактивной онлайн-доски «DOSKA»,
              размещенный в сети Интернет.
            </p>
            <p className="mt-1">
              <strong>1.4. Подписка «DOSKA PRO»</strong> — предоставление Заказчику расширенного неисключительного доступа к
              функционалу Сервиса (отключение всех видов рекламы, отсутствие рекламных пауз при открытии уроков, расширенные
              инструменты математического анализа, неограниченное сохранение досок).
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">2. Предмет Договора</h3>
            <p className="mt-1">
              2.1. Исполнитель обязуется оказывать Заказчику информационные услуги путем предоставления онлайн-доступа к функционалу
              «DOSKA PRO», а Заказчик обязуется оплачивать данные услуги на условиях предоплатной периодической подписки.
            </p>
            <p className="mt-1">
              2.2. Акцептом настоящей оферты является факт нажатия кнопки оплаты («Оформить подписку за 99 ₽/мес») и успешное
              проведение первого платежа.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">3. Стоимость услуг и порядок оплаты</h3>
            <p className="mt-1">
              3.1. Стоимость доступа по тарифу «DOSKA PRO» составляет <strong>99 (девяносто девять) рублей</strong> за период
              продолжительностью 30 (тридцать) календарных дней.
            </p>
            <p className="mt-1">
              3.2. НДС не облагается на основании ст. 346.11 НК РФ и Федерального закона от 27.11.2018 № 422-ФЗ в связи с
              применением Исполнителем специального налогового режима «Налог на профессиональный доход».
            </p>
            <p className="mt-1">
              3.3. Прием платежей осуществляется уполномоченным оператором платежей — ООО НКО «ЮМани» (сервис «ЮKassa»,
              лицензия Банка России № 3510-К). Сервис DOSKA не собирает, не обрабатывает и не хранит полные реквизиты банковских
              карт Пользователей. Все операции защищены по международному стандарту безопасности PCI DSS.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">4. Условия рекуррентных платежей (автопродление)</h3>
            <p className="mt-1">
              4.1. Оформляя подписку, Заказчик дает безоговорочное согласие на регулярное безакцептное (автоматическое) списание
              денежных средств в размере 99 рублей каждые 30 календарных дней с привязанного электронного средства платежа (банковской карты).
            </p>
            <p className="mt-1">
              4.2. Автоматическое списание производится в дату окончания текущего оплаченного периода. В случае недостаточности
              средств на карте доступ по тарифу PRO приостанавливается до момента успешного платежа.
            </p>
            <p className="mt-1">
              4.3. <strong>Порядок отказа от подписки (отмена автосписания):</strong> Заказчик вправе в любой момент отказаться от
              автоматического продления подписки. Для этого достаточно нажать кнопку «Отменить автосписание» в модальном окне
              подписки / личном кабинете на сайте либо направить уведомление по электронной почте <strong>vainbergerivan0608@gmail.com</strong>.
            </p>
            <p className="mt-1">
              4.4. При отмене автопродления оплаченные средства за текущий период не сгорают, а функционал «DOSKA PRO» в полном объеме
              сохраняется за Заказчиком до конца уже оплаченного 30-дневного интервала.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">5. Правила возврата денежных средств</h3>
            <p className="mt-1">
              5.1. В соответствии со ст. 32 Закона РФ «О защите прав потребителей» Заказчик вправе отказаться от исполнения договора
              при условии оплаты Исполнителю фактически понесенных им расходов.
            </p>
            <p className="mt-1">
              5.2. Если Пользователь обратился с мотивированным заявлением о возврате в течение первых 3 (трех) календарных дней с момента
              списания и фактически не воспользовался функционалом PRO, Исполнитель производит полный возврат средств тем же способом,
              которым была произведена оплата.
            </p>
            <p className="mt-1">
              5.3. Для оформления возврата необходимо направить запрос на <strong>vainbergerivan0608@gmail.com</strong> с указанием email аккаунта и даты списания.
            </p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900">6. Реквизиты Исполнителя</h3>
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-800">
              <p><strong>Исполнитель:</strong> Самозанятый Вайнбергер Иван Юрьевич</p>
              <p><strong>Статус:</strong> Плательщик налога на профессиональный доход (НПД)</p>
              <p><strong>ИНН:</strong> 66520743874</p>
              <p><strong>Электронная почта:</strong> vainbergerivan0608@gmail.com</p>
              <p><strong>Сервис:</strong> DOSKA (интерактивная онлайн-доска для преподавателей)</p>
              <p><strong>Платёжный партнёр:</strong> ООО НКО «ЮМани» (ЮKassa), лицензия ЦБ РФ № 3510-К</p>
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            <span>Соглашение соответствует нормам ГК РФ и 54-ФЗ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-900 active:scale-95"
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>Ознакомлен и согласен</span>
          </button>
        </div>
      </div>
    </div>
  );
};
