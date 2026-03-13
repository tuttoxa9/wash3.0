import React, { useState, useMemo, useEffect } from "react";
import { Wallet,
  HelpCircle,
  Search,
  X,
  ChevronRight,
  Clock,
  PlusCircle,
  CreditCard,
  Gift,
  AlertCircle,
  Calculator,
  ArrowLeft,
  Info
} from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections: HelpSection[] = [
  {
    id: "shift",
    title: "Открытие и закрытие смены",
    description: "Начало рабочего дня, ввод остатка кассы, выбор сотрудников",
    icon: <Clock className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Начало работы</h3>
          <p className="mb-4">Каждый рабочий день начинается с открытия смены. Без этого невозможно добавлять услуги и вести учет.</p>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
              Выберите дату
            </h4>
            <p className="pl-8 text-muted-foreground">По умолчанию стоит сегодняшний день. Если нужно внести данные за прошлый день, нажмите на дату и выберите нужную в календаре.</p>

            <h4 className="font-bold text-foreground flex items-center gap-2 mt-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
              Начальная касса
            </h4>
            <p className="pl-8 text-muted-foreground">Перед выбором сотрудников программа попросит указать <strong>Остаток наличных в кассе</strong> на начало дня. Это нужно для корректной сверки в конце смены.</p>

            <h4 className="font-bold text-foreground flex items-center gap-2 mt-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">3</span>
              Состав смены и роли
            </h4>
            <p className="pl-8 text-muted-foreground">Отметьте галочками сотрудников, которые сегодня работают. Укажите роль (Мойщик / Админ) и выберите, нужно ли учитывать минимальную оплату за выход.</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
          <h4 className="flex items-center gap-2 font-bold text-amber-600 mb-2">
            <AlertCircle className="w-5 h-5" /> Важное предупреждение
          </h4>
          <p className="text-amber-600/90 text-sm">
            Если вы ошиблись при открытии смены, нажмите кнопку <strong>«Изменить состав»</strong>.
            <br/><br/>
            <strong>Внимание:</strong> Если снять галочки со всех сотрудников и сохранить — текущая смена и все добавленные за этот день услуги будут <strong>ПОЛНОСТЬЮ УДАЛЕНЫ</strong> (потребуется пароль от настроек).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "services",
    title: "Добавление услуг",
    description: "Как правильно записывать автомобили и исполнителей",
    icon: <PlusCircle className="w-5 h-5 text-green-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">Создание новой записи</h3>
          <p className="mb-5 text-muted-foreground">Для добавления услуги нажмите основную синюю кнопку <strong>«Добавить услугу»</strong> в верхней панели или кнопку с плюсиком (+) прямо на карточке конкретного сотрудника.</p>

          <div className="grid gap-4">

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-1 text-base">Машина и Услуга</h4>
              <p className="text-muted-foreground">Укажите марку или номер автомобиля и краткое название оказанной услуги.</p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-1 text-base">Исполнители и Сумма</h4>
              <p className="text-muted-foreground">
                Укажите полную стоимость услуги для клиента. Затем выберите одного или нескольких сотрудников.
                Если выбрано несколько человек, выручка с этой услуги (и начисленная зарплата) автоматически разделится между ними поровну.
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-1 text-base">Способ оплаты</h4>
              <p className="text-muted-foreground">Выберите, как клиент рассчитался: Наличные, Карта, Безнал (Организация), Сертификат или Долг. От этого зависит, куда поступят деньги в отчетах.</p>
            </div>

          </div>
        </div>
      </div>
    ),
  },
  {
    id: "payments",
    title: "Способы оплаты и Безнал",
    description: "Разница между наличными, картой и организациями",
    icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Разделение выручки</h3>
          <p className="mb-4">В системе поддерживается несколько способов оплаты. Они по-разному влияют на кассу (Итого) и на зарплату сотрудников.</p>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground text-base">Наличные и Карта</h4>
                <p className="text-muted-foreground mt-1">Обычная оплата от физических лиц. Эти суммы моментально попадают в общую кассу дня (в блоки "Наличные" и "Карта"), и с них сразу же начисляется процент сотрудникам.</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <div className="mt-1">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-foreground text-base">Безналичные (Организации)</h4>
                <p className="text-muted-foreground mt-1">При выборе "Безнал" необходимо указать организацию из выпадающего списка (список организаций настраивается в разделе "Настройки").</p>
                <div className="mt-3 p-3 bg-background rounded-xl border border-border/50 text-xs">
                  <strong>Как считаются деньги:</strong> Если в настройках организации включена галочка <em>"Учитывать в общей сумме"</em>, то оплата приплюсуется к большой цифре "Всего" за день. В противном случае она будет выведена отдельно. Зарплата работникам начисляется в любом случае.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "certificates",
    title: "Работа с сертификатами",
    description: "Продажа новых сертификатов и их погашение",
    icon: <Gift className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">Жизненный цикл сертификата</h3>

          <div className="relative pl-6 border-l-2 border-purple-500/30 space-y-8 pb-4">
            <div className="relative">
              <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-full bg-card border-2 border-purple-500 flex items-center justify-center text-purple-500 font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-lg text-foreground mb-2">Продажа сертификата</h4>
              <p className="text-muted-foreground mb-3">
                Используйте виджет <strong>"Сертификаты"</strong> (находится справа на компьютере или внизу списка на телефоне). Нажмите кнопку "Продать".
              </p>
              <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20 text-purple-700 dark:text-purple-300">
                <ul className="list-disc pl-4 space-y-1">
                  <li>Деньги <strong>сразу попадают в кассу</strong> (как движение средств по наличному или безналичному расчету).</li>
                  <li>Эта сумма <strong>НЕ влияет на зарплату</strong> сотрудников, так как физическая услуга еще не была оказана.</li>
                </ul>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[35px] top-0 w-8 h-8 rounded-full bg-card border-2 border-purple-500 flex items-center justify-center text-purple-500 font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-lg text-foreground mb-2">Использование (Оказание услуги)</h4>
              <p className="text-muted-foreground mb-3">
                Когда клиент приезжает по купленному ранее сертификату:
              </p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                  <span>В виджете "Сертификаты" найдите нужный и нажмите галочку "Использовать".</span>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-purple-500" />
                  <span><strong>ИЛИ</strong> просто добавьте услугу обычным способом и выберите оплату "Сертификат".</span>
                </div>
              </div>
              <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20 text-purple-700 dark:text-purple-300">
                <ul className="list-disc pl-4 space-y-1">
                  <li>При использовании <strong>деньги в кассу НЕ добавляются</strong> (чтобы избежать задвоения выручки).</li>
                  <li>Услуга записывается сотруднику в статистику и с нее <strong>начисляется зарплата</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "cash",
    title: "Касса и Сейф",
    description: "Сверка кассы, выплата ЗП, инкассация в сейф и ручные операции",
    icon: <Wallet className="w-5 h-5 text-amber-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Виджет «Состояние кассы»</h3>
          <p className="mb-4">В конце дня (или в любой момент) на Главной странице вы можете нажать на блок <strong>«Состояние кассы»</strong>. Это главный инструмент для закрытия смены.</p>

          <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6 space-y-4 shadow-sm">
            <div>
              <h4 className="font-bold text-foreground mb-1">1. Сверка кассы</h4>
              <p className="text-muted-foreground text-sm">Программа показывает ожидаемую сумму наличных (Начальная касса + Все наличные за услуги). Вы можете нажать кнопку сверки и ввести <strong>фактическое количество денег</strong> в ящике. Программа покажет недостачу или излишек.</p>
            </div>
            <div className="w-full h-px bg-border/50"></div>
            <div>
              <h4 className="font-bold text-foreground mb-1">2. Выплата зарплат</h4>
              <p className="text-muted-foreground text-sm">Прямо из виджета кассы нажмите «Выплатить ЗП». Выберите сотрудника из списка и введите сумму, которую выдаете ему на руки. Эта сумма автоматически вычтется из наличных в кассе.</p>
            </div>
            <div className="w-full h-px bg-border/50"></div>
            <div>
              <h4 className="font-bold text-foreground mb-1">3. Перенос в Сейф</h4>
              <p className="text-muted-foreground text-sm">В конце дня оставшуюся сумму можно перенести в Сейф. Нажмите кнопку «В сейф», укажите сумму, и деньги спишутся из текущей кассы.</p>
            </div>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-3 mt-8">Общий Сейф</h3>
          <p className="mb-4 text-muted-foreground">Доступен в левом меню в разделе <strong>Настройки → вкладка «Сейф»</strong>.</p>
          <div className="bg-muted/20 border border-border/50 rounded-2xl p-5 mb-6">
            <ul className="list-disc pl-4 space-y-2 text-muted-foreground">
              <li>Хранит общий баланс всех перенесенных туда средств.</li>
              <li>Вы можете вручную <strong>пополнить</strong> сейф или <strong>изъять</strong> из него деньги (например, босс забрал выручку).</li>
              <li>Все операции (переносы из касс, ручные изъятия) сохраняются в подробной истории с датами и суммами.</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-3 mt-8">Ручные изъятия и внесения</h3>
          <p className="mb-4 text-muted-foreground">Если в течение дня нужно дать сдачу, купить химию или воду — нажмите на блок «Наличные» (рядом с Итого). Там можно добавить Внесение или Изъятие (с комментарием). Эти операции меняют наличку в кассе, но <strong>не влияют на зарплаты</strong>.</p>
        </div>
      </div>
    ),
  },
  {
    id: "debts",
    title: "Долги",
    description: "Оформление долга клиента и его последующее закрытие",
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">Работа с должниками</h3>
          <p className="mb-6 text-muted-foreground">Если постоянный клиент помыл машину, но обещал занести деньги позже, используйте функционал долгов.</p>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center font-bold text-muted-foreground z-10">1</div>
                <div className="w-px h-full bg-border/50 my-1"></div>
              </div>
              <div className="pb-6 pt-1">
                <h4 className="font-bold text-foreground text-base">Оформление долга</h4>
                <p className="text-muted-foreground mt-1 mb-2">При добавлении услуги выберите способ оплаты <strong>«Долг»</strong>. Обязательно напишите в комментарии имя клиента и номер телефона.</p>
                <div className="bg-muted/30 p-3 rounded-lg text-xs">
                  Сотрудникам сразу <strong>начислится зарплата</strong> за эту машину. Но деньги в кассу не попадут.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center font-bold text-muted-foreground z-10">2</div>
                <div className="w-px h-full bg-border/50 my-1"></div>
              </div>
              <div className="pb-6 pt-1">
                <h4 className="font-bold text-foreground text-base">Контроль</h4>
                <p className="text-muted-foreground mt-1">Все неоплаченные долги за любые даты висят на Главной странице в виджете <strong>"Активные долги"</strong>.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-card border-2 border-green-500 flex items-center justify-center font-bold text-green-500 z-10">3</div>
              </div>
              <div className="pt-1">
                <h4 className="font-bold text-foreground text-base">Закрытие долга</h4>
                <p className="text-muted-foreground mt-1">Когда клиент принес деньги, найдите его в виджете "Активные долги" и нажмите зеленую галочку. Выберите, как он отдал деньги (Наличные или Карта).</p>
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg text-xs mt-2 text-green-700 dark:text-green-400">
                  Эта сумма автоматически добавится в кассу <strong>текущей открытой смены</strong> (в виде кассового внесения), чтобы ваши деньги сошлись здесь и сейчас.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "salary",
    title: "Расчет зарплат",
    description: "Наглядное объяснение процентов, минималки и премий",
    icon: <Calculator className="w-5 h-5 text-emerald-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Формирование заработной платы</h3>
          <p className="mb-6 text-muted-foreground">Зарплата считается автоматически. Базовые ставки и проценты задаются администратором в разделе "Настройки".</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-2">Проценты</h4>
              <p className="text-muted-foreground text-sm">
                Базовый расчет зарплаты. Программа берет стоимость оказанной услуги, делит её поровну между всеми исполнителями, а затем умножает на процент сотрудника (который зависит от его роли: Мойщик или Админ).
              </p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-2">Минимальная оплата</h4>
              <p className="text-muted-foreground text-sm">
                Гарантированный оклад за выход. Если сотрудник заработал на своих процентах за день меньше установленной минималки, программа автоматически дотянет его зарплату до этой суммы.
              </p>
            </div>

          </div>

          <div className="space-y-4">
            <div className="bg-muted/20 border border-border/50 rounded-2xl p-5 flex gap-4 items-start">
              <div className="mt-1 font-bold text-foreground text-lg">*</div>
              <div>
                <h4 className="font-bold text-foreground mb-1">Ручная ЗП (Премии и Штрафы)</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Если вы хотите заплатить сотруднику другую сумму (оштрафовать или премировать), нажмите на его карточку на Главной странице и введите <strong>«Ручную ЗП»</strong>. На карточке появится звездочка (*). Это значение <strong>перекроет все автоматические расчеты</strong>.
                </p>
              </div>
            </div>

            <div className="bg-muted/20 border border-border/50 rounded-2xl p-5 flex gap-4 items-start">
              <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-foreground mb-1 text-sm">Почасовая разбивка</h4>
                <p className="text-muted-foreground text-sm">
                  В течение рабочего времени (с 9:00 до 21:00) на карточках сотрудников отображается предварительный расчет — "ЗП за N часов". Это информативная цифра, показывающая, сколько сотрудник заработал к текущему часу. После 21:00 она превратится в окончательную "ЗП за день".
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Для десктопа - ID активной секции. Для мобилок - ID открытой секции (null если смотрим список)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0].id);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Отслеживаем размер окна
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Если переключились на десктоп и нет активной секции (были в списке на мобилке), открываем первую
      if (!mobile && !activeSectionId) {
        setActiveSectionId(sections[0].id);
      }
      // Если переключились на мобилку, сбрасываем в список для удобства
      if (mobile && isOpen && activeSectionId !== null) {
        setActiveSectionId(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSectionId, isOpen]);

  // Сброс состояния при открытии
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      if (window.innerWidth < 768) {
        setActiveSectionId(null); // Мобилка: показываем список
      } else {
        setActiveSectionId(sections[0].id); // Десктоп: показываем первую вкладку
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        // На мобилке: если открыта статья, по Esc возвращаемся в список
        if (isMobile && activeSectionId) {
          setActiveSectionId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile, activeSectionId, onClose]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Умный сброс активной секции при поиске
  useEffect(() => {
    if (!isMobile && filteredSections.length > 0 && (!activeSectionId || !filteredSections.find(s => s.id === activeSectionId))) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, isMobile, activeSectionId]);

  if (!isOpen) return null;

  const activeSection = activeSectionId ? sections.find(s => s.id === activeSectionId) : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">

      {/* HEADER */}
      <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-border/40 bg-card shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Кнопка "Назад" для мобилок */}
          {isMobile && activeSectionId ? (
            <button
              onClick={() => setActiveSectionId(null)}
              className="p-2 -ml-2 mr-1 rounded-xl hover:bg-accent text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          )}

          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold leading-tight">
              {isMobile && activeSectionId && activeSection ? activeSection.title : "Справка и Инструкции"}
            </h1>
            {(!isMobile || !activeSectionId) && (
              <span className="text-xs text-muted-foreground">Руководство пользователя</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-foreground"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative bg-background">
        <div
          className={`flex h-full w-[200%] md:w-full transition-transform duration-300 ease-in-out md:transition-none md:transform-none ${
            isMobile && activeSectionId ? "-translate-x-1/2" : "translate-x-0"
          }`}
        >

          {/* SIDEBAR / MOBILE LIST */}
          <div className="w-1/2 md:w-[320px] shrink-0 flex flex-col bg-muted/10 border-r border-border/40 h-full">
            {/* Поиск */}
            <div className="p-4 border-b border-border/40 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по инструкции..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 shadow-sm"
                />
              </div>
            </div>

            {/* Список разделов */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => {
                  const isActive = !isMobile && activeSectionId === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSectionId(section.id)}
                      className={`
                        w-full flex items-start gap-4 p-4 rounded-2xl text-left border
                        ${isActive
                          ? "bg-card border-primary/20 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-card hover:border-border/50 hover:shadow-sm"
                        }
                      `}
                    >
                      <div className={`shrink-0 p-2.5 rounded-xl ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className={`text-sm font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                          {section.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                      {isMobile && (
                        <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground self-center ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                  <Search className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Ничего не найдено</p>
                  <p className="text-xs mt-1">Попробуйте изменить запрос</p>
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="w-1/2 md:flex-1 shrink-0 flex flex-col overflow-hidden bg-background h-full relative">
            {activeSection ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 lg:p-12">
                <div className="max-w-3xl mx-auto">

                  {/* Заголовок статьи на десктопе */}
                  {!isMobile && (
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/40">
                      <div className="p-3 bg-muted/50 rounded-2xl border border-border/50">
                        {activeSection.icon}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-foreground tracking-tight">{activeSection.title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">{activeSection.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Контент */}
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                    {activeSection.content}
                  </div>

                </div>
              </div>
            ) : (
              // Empty state for desktop when nothing is selected
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-4 border border-border/50">
                  <HelpCircle className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Выберите раздел</h3>
                <p className="text-sm mt-1 max-w-xs text-center">Инструкции и ответы на частые вопросы появятся здесь</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default HelpModal;
