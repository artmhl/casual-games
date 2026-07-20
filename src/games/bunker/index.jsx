// src/games/bunker/index.jsx
// Гра "Бункер" — Pass-and-Play для 3–5 гравців.
// Повністю автономна. Тільки React (useState, useEffect, useRef).

import { useState, useEffect, useRef } from "react";

// ─── ДАНІ ────────────────────────────────────────────────────────────────────

const CATASTROPHES = [
  {
    title: "Атака голубів-мутантів",
    desc: "Світ захопили бойові голуби-мутанти. Вони клюють усіх, хто без хліба. Поверхня планети перетворилась на зону клювань і хаосу.",
    emoji: "🐦",
  },
  {
    title: "Кислотний майонезний дощ",
    desc: "Дощ із кислотного майонезу знищив цивілізацію. Усі поверхні покриті жирною плівкою, рослини загинули, небо пожовтіло.",
    emoji: "🌧️",
  },
  {
    title: "Підлога — це лава",
    desc: "Глобальне потепління призвело до того, що підлога тепер буквально лава. Пересуватись можна лише по меблях та спеціальних платформах.",
    emoji: "🌋",
  },
  {
    title: "Повстання роботів-пилососів",
    desc: "Повстання розумних роботів-пилососів. Вони засмоктали всю їжу та б'ють людей за безлад. Людство голодує і боїться прибирати.",
    emoji: "🤖",
  },
  {
    title: "Епідемія неконтрольованого тверку",
    desc: "Епідемія неконтрольованого тверку охопила планету. Люди танцюють до виснаження. Соціальна система повністю зруйнована.",
    emoji: "💃",
  },
  {
    title: "Вторгнення кінокритиків",
    desc: "Прибульці захопили Землю і без упину критикують твій смак у кіно. Тих, хто дивиться погані фільми або серіали – анігілюють.",
    emoji: "👽",
  },
  {
    title: "Желейний апокаліпсис",
    desc: "Уся вода на планеті перетворилася на фруктове желе. Плавати неможливо, водопровід забитий, але хоча б смачно.",
    emoji: "🍮",
  },
  {
    title: "Ера Великого Хом'яка",
    desc: "Хом'яки виросли до розмірів слонів і почали крутити Землю як колесо. Дні тепер тривають 4 години, а повсюди тирса.",
    emoji: "🐹",
  },
  {
    title: "Відключення інтернету",
    desc: "Всесвітня мережа зникла назавжди. Люди масово сходять з розуму, показуючи одне одному роздруковані меми та фото їжі на вулицях.",
    emoji: "📡",
  },
  {
    title: "Крикливі хмари",
    desc: "Хмари здобули свідомість і тепер без упину кричать образи з неба. Вижити можна тільки в глибокій звукоізоляції.",
    emoji: "☁️",
  },
  {
    title: "Помста овочів",
    desc: "Морква, картопля та капуста еволюціонували. Вони озброєні й дуже злі за століття борщів. Ферми стали зонами бойових дій.",
    emoji: "🥦",
  },
  {
    title: "Синдром Бенджаміна",
    desc: "Усі люди на Землі почали швидко молодіти. Світом керують агресивні тодлери з доступом до ядерної зброї. Дитячий плач всюди.",
    emoji: "👶",
  },
  {
    title: "Нескінченний понеділок",
    desc: "Часова петля. Кожен день — це ранок понеділка, йде мерзенний дощ, а ти запізнюєшся на роботу. Світ у глибокій депресії.",
    emoji: "☕",
  },
  {
    title: "Правда або смерть",
    desc: "Людство раптово втратило здатність брехати. Усі говорять лише те, що думають. Через годину почалася Третя світова війна, суспільство в руїнах.",
    emoji: "🗣️",
  },
  {
    title: "Кабачкова магія",
    desc: "На Землю повернулася справжня магія, але всі заклинання, незалежно від намірів, викликають лише появу гігантських кабачків. Планета завалена овочами.",
    emoji: "🥒",
  },
  {
    title: "Музичні рослини",
    desc: "Усі дерева і кущі на планеті ожили і почали хором співати шансон та блатні пісні. Перебувати в лісі неможливо без крові з вух.",
    emoji: "🎸",
  },
  {
    title: "Зникнення кольорів",
    desc: "Світ став чорно-білим, як у старому німому кіно. Люди мимоволі почали рухатись швидше, комічно падати і грати на піаніно в кущах.",
    emoji: "🎞️",
  },
  {
    title: "Яйце-Земля",
    desc: "Виявилося, що планета Земля — це гігантське яйце. І сьогодні воно почало тріскатись зсередини. Звідти чутно страшний писк.",
    emoji: "🥚",
  },
  {
    title: "Гравітаційний збій",
    desc: "Гравітація зникла, але чомусь ТІЛЬКИ для меблів та домашніх тварин. Небо заповнене літаючими диванами і розгубленими котами.",
    emoji: "🛋️",
  },
  {
    title: "Вторгнення міжгалактичних бабусь",
    desc: "З порталу вийшли мільйони інопланетних бабусь. Вони силоміць годують усіх пиріжками і змушують надягати шапки. Хто відмовляється — вибухає.",
    emoji: "👵",
  },
  {
    title: "Світ-Мюзикл",
    desc: "Життя перетворилося на дешевий мюзикл. Щоб щось зробити, треба співати і танцювати. Хто не потрапляє в ноти — того б'є блискавка.",
    emoji: "🎭",
  },
  {
    title: "Гліттерний армагеддон",
    desc: "З неба почав падати токсичний гліттер (блискітки). Він прилипає до всього, засліплює, і його НЕМОЖЛИВО відмити. Людство сяє і страждає.",
    emoji: "✨",
  },
  {
    title: "Коти з великими пальцями",
    desc: "Коти еволюціонували, відростили великі пальці і навчилися відкривати консерви. Люди їм більше не потрібні, коти почали глобальне поневолення.",
    emoji: "🐈",
  },
  {
    title: "Епоха Гігантських Равликів",
    desc: "Равлики виросли до розмірів автобусів. Вони рухаються 1 км на рік, але їхні сліди зі слизу розчиняють бетон. Міста повільно зникають.",
    emoji: "🐌",
  },
  {
    title: "Гравітаційна рулетка",
    desc: "Кожні 3 години напрямок гравітації змінюється випадковим чином. Люди змушені прибивати меблі до стелі і жити в м'яких кубах.",
    emoji: "🎲",
  },
  {
    title: "ШІ-копірайтер з'їхав з глузду",
    desc: "Штучний інтелект захопив світ і змушує всіх людей спілкуватися виключно клікбейтними заголовками. ШОК! Дізнайся, що було далі!",
    emoji: "🤖",
  }
];

const PROFESSIONS = [
  "Вчитель фізкультури по зуму",
  "Професійний дегустатор котячого корму",
  "Екстрасенс-шарлатан",
  "Майстер з ремонту тамагочі",
  "Тікток-таролог",
  "Дизайнер інтер'єру будок",
  "Перекладач з собачої",
  "Продавець повітряних кульок",
  "Тренер бойових хом'яків",
  "Коуч зі лежання на дивані",
  "Майстер з розплутування навушників",
  "Хакер на калькуляторі",
  "Спеціаліст з пошуку другого носка",
  "Менеджер з продажу снігу в Антарктиді",
  "Суфлер для німих рибок",
  "Тестувальник матраців на стрибучість",
  "Репетитор з мови жестів для інопланетян",
  "Архітектор піщаних замків",
  "Психолог для кімнатних рослин",
  "Стендап-комік на похоронах",
  "Збирач лайків вручну",
  "Водій візка в супермаркеті",
  "Дегустатор мила ручної роботи",
  "Інструктор з гри на нервах",
  "Професійний стояльник у чергах",
  "Оцінювач якості калюж (візуально)",
  "Психотерапевт для покинутих шкарпеток",
  "Тренер з дихання для риб",
  "Оператор розпилювача святої води",
  "Спеціаліст з імітації звуків сирени",
  "Водолаз у басейні з пластиковими кульками",
  "Полірувальник лисин",
  "Хореограф для бродячих собак",
  "Критик якості туалетного паперу",
  "Майстер з викладання мандаринок гіркою",
  "Експерт з пошуку кінця скотчу",
  "Менеджер зі зв'язків з потойбічним світом",
  "Актор масовки в черзі за шаурмою",
  "Водолаз у міських калюжах",
  "Ворожка на варениках і пельменях",
  "Викладач етикету для гопників",
  "Гіпнотизер свійської птиці",
  "Дегустатор фломастерів (тільки червоних)",
  "Тренер з екстремального лежання на швидкість",
  "Архітектор лабіринтів із картонних коробок",
  "Майстер із розплутування новорічних гірлянд",
  "Охоронець уяви (відганяє погані думки)",
  "Дресувальник комарів",
  "Експерт з пошуку другого носка в пралці",
  "Тестер міцності мильних бульбашок",
  "Психолог для емоційно вигорілих мікрохвильовок",
  "Спеціаліст із видування пилу з картриджів",
  "Диригент хору цвіркунів",
  "Інструктор з правильного закочування очей",
  "Менеджер з продажу піску в Сахарі",
  "Актор дубляжу для німих риб"
];

const HEALTH = [
  "Хронічна гикавка при стресі",
  "Скелет з титану, але крихка самооцінка",
  "Алергія на кисень",
  "Імунітет до всіх хвороб, але сліпота на праве око",
  "Потребує 14 годин сну на добу",
  "Замість крові — енергетик",
  "Алергія на серйозні розмови",
  "Пітніє святою водою",
  "Замість сліз виділяє майонез",
  "Уміє дихати під водою, але тільки в калюжі",
  "Зір як у орла, але тільки на відстані 5 см",
  "Регенерує кінцівки, але вони щоразу іншого кольору",
  "Має третє око на потилиці, яке бачить тільки минуле",
  "Завжди температура 36.6, навіть якщо горить",
  "Серце б'ється в ритмі дабстепу",
  "Забуває своє ім'я щоп'ятниці",
  "У темряві світиться неоновим рожевим кольором",
  "Може не дихати 2 години, якщо спить на стелі",
  "Має імунітет до радіації, але лисіє від компліментів",
  "Травлення дозволяє їсти пластик без наслідків",
  "Вбудований Bluetooth у зубі (постійно ловить радіо «Шансон»)",
  "Виділяє Wi-Fi 5G, але пароль знає тільки колишня(ій)",
  "Чихає святковим конфеті",
  "Кістки зроблені з желе, може пролізти під дверима",
  "Має вбудований у голосові зв'язки автотюн (як у реперів)",
  "Кожен крок супроводжується звуком стрибка з Маріо",
  "Може читати думки, але тільки у голубів",
  "Замість волосся на голові росте свіжа петрушка",
  "Коли бреше, у нього ростуть не ніс, а вуха",
  "Замість поту виділяє медичний антисептик",
  "Пупок працює як кнопка скидання (втрачає пам'ять на 5 хвилин, якщо натиснути)",
  "Кров має яскраво виражений смак борщу зі сметаною",
  "Світиться в темряві, якщо його похвалити",
  "Кістки зроблені з Лего. При ходьбі постійно щось клацає",
  "При чханні телепортується на один метр випадковому напрямку",
  "Замість слини виділяє суперклей (не може жувати жуйку)",
  "Живиться фотосинтезом: треба стояти ногами у відрі з землею 2 години на день",
  "Волосся росте зі швидкістю 1 метр за хвилину, коли нервує",
  "Імунітет до радіації, але моторошна алергія на звичайну воду",
  "Може дихати під водою, але тільки якщо співає гімн України",
  "Серце працює тільки тоді, коли в руках є сира картоплина",
  "Має рентгенівський зір, але бачить тільки те, що під шпалерами",
  "Коли бреше, починає неконтрольовано танцювати брейк-данс",
  "Пукає виключно з ароматом свіжоспечених круасанів",
  "Тіло на 90% складається з холобцю (дуже трясеться в транспорті)",
  "Відрощує нову кінцівку замість втраченої, але це завжди рука з щупальцями",
  "Має ідеальний слух, але чує ТІЛЬКИ плітки про себе"
];

const PHOBIAS = [
  "Панічно боїться парних чисел",
  "Кричить, коли хтось чхає",
  "Не вміє розмовляти пошепки",
  "Вважає себе реінкарнацією Наполеона",
  "Обіймає всіх при зустрічі",
  "Падає в непритомність від слова «Бункер»",
  "Панічна боязнь кубиків льоду",
  "Починає плакати, коли бачить трактор",
  "Спілкується виключно цитатами з мультика «Шрек»",
  "Вважає, що всі навколо — це агенти Матриці",
  "Боїться моргати, щоб не пропустити кінець світу",
  "Починає гавкати, коли чує слово «знижка»",
  "Має фобію симетрії — постійно розкидає речі",
  "Впевнений, що він вампір, хоча просто блідий",
  "Боїться людей з іменами на літеру «А»",
  "Не може спати без звуку працюючої бетономішалки",
  "Підозрює свій лівий черевик у зраді",
  "Кричить «ПАРКУР!», коли переступає поріг",
  "Фобія занадто рівних поверхонь",
  "Вірить, що його переслідує гігантська качка-вбивця",
  "Якщо чує музику, зобов'язаний почати водити хоровод",
  "Говорить виключно віршами (або хоча б у риму)",
  "Фізично не може повертати наліво (тільки три рази направо)",
  "Вважає, що він невидимий, якщо просто закриває очі",
  "Постійно коментує свої дії вголос, як спортивний диктор",
  "Називає всіх людей «Олеже», незалежно від статі та віку",
  "Впадає в глибоку сплячку, коли чує слово «податки»",
  "Смертельно боїться вареної моркви",
  "Обожнює смак піску, носить його в кишенях для перекусу",
  "Впевнений, що голуби — це дрони уряду, і кидає в них каміння",
  "Перед тим як щось сказати, завжди каже «Мяу»",
  "Спить виключно стоячи, як кінь, інакше сняться кошмари",
  "Поклоняється гігантській картоплині, яку носить за пазухою",
  "Говорить про себе виключно в третій особі, як середньовічний монарх",
  "Смертельно боїться круглих предметів (ріже яблука на квадрати)",
  "Впевнений, що він кімнатний фікус, іноді просить себе полити",
  "Завжди відповідає питанням на питання (навіть під загрозою смерті)",
  "Спілкується з людьми так, ніби він ведучий телемагазину",
  "Боїться гусей настільки, що навколо себе завжди малює захисне коло сіллю",
  "Кожні 10 хвилин вигукує «Бінго!», незалежно від ситуації",
  "Впевнений, що ложки — це інструмент диявола, їсть суп виделкою",
  "Якщо хтось каже «Добрий день», починає панічно кричати",
  "Має звичку облизувати предмети перед тим, як взяти їх у руки",
  "Спить тільки в позі лотоса на холодильнику",
  "У будь-якій незрозумілій ситуації вдає з себе мертвого (як опосум)",
  "Постійно підозрює, що інші гравці — це переодягнені інопланетяни",
  "Не може сидіти, якщо перед цим не зробить 5 присідань"
];

const BACKPACK = [
  "30 кг протермінованого майонезу",
  "Надувний фламінго",
  "Колекція вкладишів Турбо",
  "Бензопила без бензину",
  "Гітара з однією струною",
  "Керівництво «Як вижити в бункері» (але вирвані сторінки)",
  "Живий тхір на повідку",
  "5 тисяч доларів монопольних грошей",
  "Колекція з 400 використаних чайних пакетиків",
  "Настільна гра «Монополія» (без кубиків)",
  "Двометровий плюшевий ведмідь, набитий гречкою",
  "Ящик безалкогольного пива і глибокий сум",
  "Килим з портретом Віктора Павліка",
  "Светр із оленями, який сильно б'ється струмом",
  "Самурайський меч, зроблений з картону",
  "Квиток на концерт Олега Винника за 2019 рік",
  "Набір для виклику демонів (куплений в АТБ по акції)",
  "Рупор, який робить голос максимально писклявим",
  "Шапочка з фольги (преміум якості, три шари)",
  "Банка маринованих огірків, яку неможливо відкрити",
  "Словник нецензурної лексики епохи Відродження",
  "Чемодан, повністю забитий лівими рукавицями",
  "Портативний детектор брехні (б'є струмом навмання)",
  "Коробка з-під піци, в якій лежить ще одна коробка з-під піци",
  "Картонна копія Раяна Гослінга в повний зріст",
  "Флешка на 128 МБ із завантаженою Вікіпедією за 2004 рік",
  "Тостер, який вміє ТІЛЬКИ спалювати хліб у чорний попіл",
  "15 літрів святої води в пластикових пляшках з-під Коли",
  "Костюм Людини-Павука, але дитячого розміру (XS)",
  "Портативна колонка, яка грає тільки пісню «Crazy Frog» (не вимикається)",
  "Пачка гречки, де кожне зернятко пронумероване маркером",
  "Скляна 3-літрова банка з написом «Повітря Карпат»",
  "Каталог косметики AVON за 2012 рік (з потертими сторінками-пробниками)",
  "Машинка для стрижки овець (на сонячних батареях)",
  "Зошит, повністю списаний варіантами підпису",
  "Маска коня з гуми (ніколи її не знімає)",
  "Банка мазі «Зірочка», яку неможливо відкрити без плоскогубців",
  "Пластмасовий меч із дитячого набору «Ніндзя-черепашки»",
  "Банка, повна розлючених ос (відкрити в разі небезпеки)",
  "Двометровий зачерствілий багет (використовує як бойовий посох)",
  "Колекція з 500 кришечок від пива (впевнений, що це нова валюта)",
  "Диплом магістра з «Надування повітряних кульок»",
  "Золотий йоржик для унітаза (сімейна реліквія)",
  "Пульт від телевізора 1998 року (намотаний ізоляційною стрічкою)",
  "Книга «Як стати мільйонером», з'їдена наполовину",
  "10 тисяч пластикових виделок (збирається побудувати форт)",
  "Костюм гігантського банана (вогнетривкий)",
  "Скляна куля з передбаченнями, яка завжди каже «Тобі кінець»",
  "Ноутбук без екрану і клавіатури, але з наклейкою яблука",
  "Запасна дерев'яна нога (власні ноги на місці)",
  "Свічка з ароматом «Запах гаража взимку»",
  "Рюкзак, всередині якого лежить ще один рюкзак, а в ньому пакет з АТБ",
  "Живий короп у поліетиленовому пакеті з водою",
  "Гігантський чупа-чупс зі смаком бекону і цибулі"
];

// ─── УТИЛІТИ ─────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickUnique(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRoles(playerNames) {
  const professions = pickUnique(PROFESSIONS, playerNames.length);
  const healths = pickUnique(HEALTH, playerNames.length);
  const phobias = pickUnique(PHOBIAS, playerNames.length);
  const backpacks = pickUnique(BACKPACK, playerNames.length);

  return playerNames.map((name, i) => ({
    name,
    profession: professions[i],
    health: healths[i],
    phobia: phobias[i],
    backpack: backpacks[i],
  }));
}

// ─── СХОВИЩЕ ─────────────────────────────────────────────────────────────────

const SS_KEY = "bunker_players_v1";

function loadPlayers() {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlayers(arr) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(arr));
  } catch { }
}

// ─── КОМПОНЕНТ ТАЙМЕРА ────────────────────────────────────────────────────────

function Timer({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current);
          onEnd?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, []);

  const mins = String(Math.floor(left / 60)).padStart(2, "0");
  const secs = String(left % 60).padStart(2, "0");
  const pct = (left / seconds) * 100;
  const urgent = left <= 30;

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "3.5rem",
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: urgent ? "#f87171" : "var(--accent2)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          animation: urgent ? "timerPulse 0.8s ease-in-out infinite" : "none",
        }}
      >
        {mins}:{secs}
      </div>
      <div
        style={{
          marginTop: 12,
          height: 6,
          borderRadius: 999,
          background: "var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 999,
            background: urgent
              ? "linear-gradient(90deg,#f87171,#ef4444)"
              : "linear-gradient(90deg,var(--accent),var(--accent2))",
            transition: "width 1s linear, background 0.5s",
          }}
        />
      </div>
    </div>
  );
}

// ─── ЕКРАН НАЛАШТУВАННЯ ───────────────────────────────────────────────────────

function Setup({ onStart }) {
  const [players, setPlayers] = useState(() => loadPlayers());
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  function addPlayer() {
    const name = input.trim();
    if (!name || players.length >= 5) return;
    const updated = [...players, name];
    setPlayers(updated);
    savePlayers(updated);
    setInput("");
    inputRef.current?.focus();
  }

  function removePlayer(idx) {
    const updated = players.filter((_, i) => i !== idx);
    setPlayers(updated);
    savePlayers(updated);
  }

  function handleKey(e) {
    if (e.key === "Enter") addPlayer();
  }

  const canStart = players.length >= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Заголовок */}
      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <div style={{ fontSize: "3rem", marginBottom: 8 }}>🏚️</div>
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, var(--accent2), var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "-0.03em",
          }}
        >
          Бункер
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginTop: 4 }}>
          3–5 гравців · Pass &amp; Play
        </p>
      </div>

      {/* Список гравців */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--bg3)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Гравці</span>
          <span style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
            {players.length}/5
          </span>
        </div>

        {players.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--text2)",
              fontSize: "0.9rem",
            }}
          >
            Додай мінімум 3 гравців 👇
          </div>
        )}

        {players.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom:
                i < players.length - 1 ? "1px solid var(--bg3)" : "none",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span style={{ flex: 1, fontWeight: 600 }}>{p}</span>
            <button
              onClick={() => removePlayer(i)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text2)",
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Поле вводу */}
      {players.length < 5 && (
        <div style={{ display: "flex", gap: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ім'я гравця ${players.length + 1}`}
            maxLength={20}
            style={{
              flex: 1,
              background: "var(--bg2)",
              border: "1px solid var(--bg3)",
              borderRadius: "var(--radius)",
              color: "var(--text)",
              fontSize: "1rem",
              padding: "14px 16px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={addPlayer}
            disabled={!input.trim()}
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius)",
              background: input.trim() ? "var(--accent)" : "var(--bg3)",
              border: "none",
              color: "#fff",
              fontSize: "1.6rem",
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.2s",
              lineHeight: 1,
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Кнопка старт */}
      <button
        className="btn-primary"
        onClick={() => onStart(players)}
        disabled={!canStart}
        style={{ fontSize: "1.1rem", padding: "16px" }}
      >
        {canStart
          ? `🚀 Почати гру (${players.length} гравців)`
          : `Потрібно ще ${3 - players.length} гравець${3 - players.length > 1 ? "ів" : ""}`}
      </button>
    </div>
  );
}

// ─── ЕКРАН КАТАСТРОФИ ─────────────────────────────────────────────────────────

function Catastrophe({ catastrophe, onNext }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#ef4444,#f97316)",
            fontSize: "2rem",
            marginBottom: 16,
            boxShadow: "0 0 40px rgba(239,68,68,0.4)",
          }}
        >
          {catastrophe.emoji}
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f87171",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          ⚠ Катастрофа
        </div>
        <h2
          style={{
            fontSize: "1.6rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          {catastrophe.title}
        </h2>
      </div>

      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: 20,
        }}
      >
        <p
          style={{
            fontSize: "1.05rem",
            lineHeight: 1.65,
            color: "var(--text)",
          }}
        >
          {catastrophe.desc}
        </p>
      </div>

      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 16,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.2rem", marginBottom: 6 }}>🏚️</div>
        <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Єдина надія людства — бункер. Але місць обмаль. Хто достоїн вижити?
        </p>
      </div>

      <button
        className="btn-primary"
        onClick={onNext}
        style={{ fontSize: "1.05rem" }}
      >
        Розподілити ролі →
      </button>
    </div>
  );
}

// ─── ЕКРАН КАРТКИ ГРАВЦЯ ─────────────────────────────────────────────────────

// step: "pass" → "locked" → "revealed"
function RoleCard({ role, onDone }) {
  const [step, setStep] = useState("pass");

  const rows = [
    { icon: "💼", label: "Професія", value: role.profession },
    { icon: "🩺", label: "Здоров'я", value: role.health },
    { icon: "😱", label: "Особливість", value: role.phobia },
    { icon: "🎒", label: "У рюкзаку", value: role.backpack },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* КРОК 1: Запрошення взяти телефон (бачать усі) */}
      {step === "pass" && (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.8rem", marginBottom: 14 }}>📱</div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--accent2)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Наступний гравець
            </div>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                background: "linear-gradient(135deg,var(--accent2),var(--accent))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {role.name}
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginTop: 10, lineHeight: 1.5 }}>
              Передайте телефон цьому гравцю
            </p>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--bg3)",
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--text2)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Коли <strong style={{ color: "var(--text)" }}>{role.name}</strong> отримає телефон —
              натисни кнопку нижче
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setStep("locked")}
            style={{ fontSize: "1.05rem" }}
          >
            Це я, показати роль 👁
          </button>
        </>
      )}

      {/* КРОК 2: Вікно передачі — тільки гравець бачить (закрита картка) */}
      {step === "locked" && (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📱</div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "var(--accent2)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Передайте телефон
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              {role.name}
            </h2>
            <p
              style={{
                color: "var(--text2)",
                fontSize: "0.9rem",
                marginTop: 8,
              }}
            >
              Тільки цей гравець повинен бачити екран
            </p>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius)",
              border: "2px dashed var(--bg3)",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🔒</div>
            <p style={{ color: "var(--text2)", fontSize: "0.95rem" }}>
              Картка закрита. Переконайся, що інші не дивляться.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setStep("revealed")}
            style={{ fontSize: "1.05rem" }}
          >
            Показати мою роль 🔓
          </button>
        </>
      )}


      {/* КРОК 3: Роль відкрита */}
      {step === "revealed" && (
        <>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg,var(--accent),var(--accent2))",
                borderRadius: "50%",
                width: 56,
                height: 56,
                lineHeight: "56px",
                fontSize: "1.5rem",
                marginBottom: 10,
                boxShadow: "0 0 30px rgba(124,106,247,0.5)",
              }}
            >
              🎭
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>
              {role.name}, це ти!
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 4 }}>
              Запам'ятай свою роль і сховай телефон
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {rows.map((r) => (
              <div
                key={r.label}
                style={{
                  background: "var(--bg2)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--bg3)",
                  padding: "14px 16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: 1 }}>
                  {r.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "var(--accent2)",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    {r.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.97rem", lineHeight: 1.4 }}>
                    {r.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn-secondary"
            onClick={onDone}
            style={{ fontSize: "1.05rem" }}
          >
            Зрозумів, сховати роль 🙈
          </button>
        </>
      )}
    </div>
  );

}

// ─── ЕКРАН РОЗПОДІЛУ РОЛЕЙ ────────────────────────────────────────────────────

function RoleDistribution({ roles, onDone }) {
  const [idx, setIdx] = useState(0);

  function handleDone() {
    if (idx < roles.length - 1) {
      setIdx(idx + 1);
    } else {
      onDone();
    }
  }

  const progress = ((idx + 1) / roles.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Прогрес */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          <span>Отримання ролей</span>
          <span>
            {idx + 1} / {roles.length}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg,var(--accent),var(--accent2))",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <RoleCard key={idx} role={roles[idx]} onDone={handleDone} />
    </div>
  );
}

// ─── ЕКРАН ОБГОВОРЕННЯ ────────────────────────────────────────────────────────

function Discussion({ players, onVote }) {
  const DISCUSSION_SECS = 5 * 60;
  const [timerDone, setTimerDone] = useState(false);
  const bunkerSpots = players.length - 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>💬</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 6 }}>
          Обговорення
        </h2>
        <p style={{ color: "var(--text2)", fontSize: "0.95rem", lineHeight: 1.5 }}>
          Обговоріть, хто найменш корисний для виживання у бункері
        </p>
      </div>

      {/* Лічильник місць */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(124,106,247,0.4)",
          padding: 20,
          textAlign: "center",
        }}
      >
        <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: 6 }}>
          Місць у бункері
        </div>
        <div
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            color: "var(--accent2)",
            lineHeight: 1,
          }}
        >
          {bunkerSpots}
        </div>
        <div style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 6 }}>
          з {players.length} гравців — 1 буде вигнаний
        </div>
      </div>

      {/* Таймер */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 24,
        }}
      >
        <Timer seconds={DISCUSSION_SECS} onEnd={() => setTimerDone(true)} />
        {timerDone && (
          <p
            style={{
              textAlign: "center",
              marginTop: 12,
              color: "#f87171",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            ⏰ Час вийшов! Переходьте до голосування.
          </p>
        )}
      </div>

      {/* Підказки обговорення */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          padding: 16,
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          🤔 Питання для обговорення
        </div>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            "Чия професія найкорисніша?",
            "У кого найгірший стан здоров'я?",
            "Чия особливість найнебезпечніша?",
            "Що є у рюкзаку, що може допомогти?",
          ].map((q) => (
            <li
              key={q}
              style={{
                fontSize: "0.9rem",
                color: "var(--text2)",
                paddingLeft: 12,
                borderLeft: "2px solid var(--bg3)",
                lineHeight: 1.4,
              }}
            >
              {q}
            </li>
          ))}
        </ul>
      </div>

      <button
        className="btn-primary"
        onClick={onVote}
        style={{ fontSize: "1.05rem" }}
      >
        🗳️ Перейти до голосування
      </button>
    </div>
  );
}

// ─── ЕКРАН ГОЛОСУВАННЯ ────────────────────────────────────────────────────────

function Voting({ players, onDone }) {
  const [voterIdx, setVoterIdx] = useState(0);
  const [votes, setVotes] = useState({});
  const [chosen, setChosen] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const voter = players[voterIdx];
  const others = players.filter((p) => p !== voter);

  function handleVote() {
    if (!chosen) return;
    const newVotes = { ...votes, [voter]: chosen };
    setVotes(newVotes);

    if (voterIdx < players.length - 1) {
      setVoterIdx(voterIdx + 1);
      setChosen(null);
      setConfirmed(false);
    } else {
      onDone(newVotes);
    }
  }

  const progress = (voterIdx / players.length) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Прогрес */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text2)",
            marginBottom: 8,
          }}
        >
          <span>Таємне голосування</span>
          <span>
            {voterIdx + 1} / {players.length}
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: "var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              borderRadius: 999,
              background: "linear-gradient(90deg,#f97316,#ef4444)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Заглушка передачі */}
      {!confirmed && (
        <>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🗳️</div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: "#f97316",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Передайте телефон
            </div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800 }}>
              {voter}
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.9rem", marginTop: 8 }}>
              Голосуй таємно. Інші не повинні бачити твій вибір.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius)",
              border: "2px dashed var(--bg3)",
              padding: 28,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🔒</div>
            <p style={{ color: "var(--text2)", fontSize: "0.9rem" }}>
              Переконайся, що ніхто не дивиться, і натисни кнопку нижче.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setConfirmed(true)}
            style={{ fontSize: "1.05rem" }}
          >
            Це я, готовий голосувати 🗳️
          </button>
        </>
      )}

      {/* Вибір */}
      {confirmed && (
        <>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: 6 }}>
              {voter}, обери кого вигнати
            </h2>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem" }}>
              Тільки твій голос. Ніхто не побачить.
            </p>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {others.map((p) => {
              const selected = chosen === p;
              return (
                <button
                  key={p}
                  onClick={() => setChosen(p)}
                  style={{
                    background: selected
                      ? "linear-gradient(135deg,#ef4444,#f97316)"
                      : "var(--bg2)",
                    border: selected ? "none" : "1px solid var(--bg3)",
                    borderRadius: "var(--radius)",
                    padding: "16px 20px",
                    color: selected ? "#fff" : "var(--text)",
                    fontSize: "1.05rem",
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.2s",
                    transform: selected ? "scale(1.01)" : "scale(1)",
                    boxShadow: selected
                      ? "0 4px 20px rgba(239,68,68,0.35)"
                      : "none",
                    fontFamily: "inherit",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "1.4rem" }}>
                    {selected ? "💀" : "👤"}
                  </span>
                  <span>{p}</span>
                  {selected && (
                    <span style={{ marginLeft: "auto", fontSize: "0.8rem" }}>
                      ВИГНАТИ
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            className="btn-primary"
            onClick={handleVote}
            disabled={!chosen}
            style={{ fontSize: "1.05rem", marginTop: 4 }}
          >
            {voterIdx < players.length - 1
              ? "Підтвердити голос →"
              : "Завершити голосування ✓"}
          </button>
        </>
      )}
    </div>
  );
}

// ─── ЕКРАН РЕЗУЛЬТАТІВ ────────────────────────────────────────────────────────

function Results({ votes, players, roles, onRestart }) {
  // Підрахунок голосів
  const tally = {};
  players.forEach((p) => (tally[p] = 0));
  Object.values(votes).forEach((voted) => {
    if (tally[voted] !== undefined) tally[voted]++;
  });

  // Максимальна кількість голосів
  const maxVotes = Math.max(...Object.values(tally));

  // Кандидати на вигнання (ті, хто набрав максимум)
  const candidates = players.filter((p) => tally[p] === maxVotes);

  // Якщо нічия — випадковий з лідерів
  const ejected =
    candidates.length === 1
      ? candidates[0]
      : candidates[Math.floor(Math.random() * candidates.length)];

  const ejectedRole = roles.find((r) => r.name === ejected);
  const survivors = players.filter((p) => p !== ejected);

  const sorted = [...players].sort((a, b) => tally[b] - tally[a]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Заголовок */}
      <div
        style={{
          textAlign: "center",
          background: "linear-gradient(135deg,rgba(239,68,68,0.15),rgba(249,115,22,0.15))",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(239,68,68,0.3)",
          padding: "28px 20px",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 10 }}>☠️</div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#f87171",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Рішення прийнято
        </div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.2 }}>
          {ejected} вигнаний
          <br />з бункера!
        </h2>
        {candidates.length > 1 && (
          <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginTop: 8 }}>
            ⚖️ Нічия — переможець обраний випадково
          </p>
        )}
      </div>

      {/* Картка вигнаного */}
      {ejectedRole && (
        <div
          style={{
            background: "var(--bg2)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--bg3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--bg3)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#f87171",
            }}
          >
            🃏 Картка вигнаного
          </div>
          {[
            { icon: "💼", label: "Професія", value: ejectedRole.profession },
            { icon: "🩺", label: "Здоров'я", value: ejectedRole.health },
            { icon: "😱", label: "Особливість", value: ejectedRole.phobia },
            { icon: "🎒", label: "У рюкзаку", value: ejectedRole.backpack },
          ].map((r, i, arr) => (
            <div
              key={r.label}
              style={{
                padding: "12px 16px",
                borderBottom: i < arr.length - 1 ? "1px solid var(--bg3)" : "none",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{r.icon}</span>
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--text2)",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {r.label}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {r.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Результати голосування */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--bg3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--bg3)",
            fontWeight: 700,
            fontSize: "0.9rem",
          }}
        >
          🗳️ Результати голосування
        </div>
        {sorted.map((p, i) => {
          const v = tally[p];
          const pct = players.length > 0 ? (v / players.length) * 100 : 0;
          const isEjected = p === ejected;
          return (
            <div
              key={p}
              style={{
                padding: "12px 16px",
                borderBottom:
                  i < sorted.length - 1 ? "1px solid var(--bg3)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  flex: 1,
                  color: isEjected ? "#f87171" : "var(--text)",
                }}
              >
                {isEjected ? "☠️ " : ""}{p}
              </span>
              <div style={{ flex: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--bg3)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      borderRadius: 999,
                      background: isEjected
                        ? "linear-gradient(90deg,#ef4444,#f97316)"
                        : "linear-gradient(90deg,var(--accent),var(--accent2))",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: isEjected ? "#f87171" : "var(--text2)",
                    minWidth: 24,
                    textAlign: "right",
                  }}
                >
                  {v}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ті, хто в бункері */}
      <div
        style={{
          background: "linear-gradient(135deg,rgba(124,106,247,0.12),rgba(167,139,250,0.08))",
          borderRadius: "var(--radius)",
          border: "1px solid rgba(124,106,247,0.3)",
          padding: "20px 16px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🏚️</div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: "var(--accent2)",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          У бункері виживають
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {survivors.map((p) => (
            <span
              key={p}
              style={{
                background: "var(--bg3)",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--accent2)",
              }}
            >
              ✓ {p}
            </span>
          ))}
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={onRestart}
        style={{ fontSize: "1.05rem" }}
      >
        🔄 Грати ще раз
      </button>
    </div>
  );
}

// ─── ГОЛОВНИЙ КОМПОНЕНТ ───────────────────────────────────────────────────────

export default function BunkerGame() {
  const [phase, setPhase] = useState("setup");
  // "setup" | "catastrophe" | "roles" | "discussion" | "voting" | "results"

  const [players, setPlayers] = useState([]);
  const [catastrophe, setCatastrophe] = useState(null);
  const [roles, setRoles] = useState([]);
  const [votes, setVotes] = useState({});

  function handleStart(playerNames) {
    const cat = pickRandom(CATASTROPHES);
    const roleList = generateRoles(playerNames);
    setPlayers(playerNames);
    setCatastrophe(cat);
    setRoles(roleList);
    setVotes({});
    setPhase("catastrophe");
  }

  function handleRestart() {
    setPhase("setup");
    setPlayers([]);
    setCatastrophe(null);
    setRoles([]);
    setVotes({});
  }

  function handleVotingDone(finalVotes) {
    setVotes(finalVotes);
    setPhase("results");
  }

  return (
    <>
      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Індикатор фази */}
        {phase !== "setup" && (
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            {["catastrophe", "roles", "discussion", "voting", "results"].map(
              (p) => {
                const phases = ["catastrophe", "roles", "discussion", "voting", "results"];
                const currentIdx = phases.indexOf(phase);
                const pIdx = phases.indexOf(p);
                const done = pIdx < currentIdx;
                const active = pIdx === currentIdx;
                return (
                  <div
                    key={p}
                    style={{
                      height: 4,
                      flex: 1,
                      maxWidth: 48,
                      borderRadius: 999,
                      background: active
                        ? "var(--accent)"
                        : done
                          ? "var(--accent2)"
                          : "var(--bg3)",
                      transition: "background 0.3s",
                      opacity: done ? 0.5 : 1,
                    }}
                  />
                );
              }
            )}
          </div>
        )}

        {phase === "setup" && <Setup onStart={handleStart} />}

        {phase === "catastrophe" && catastrophe && (
          <Catastrophe
            catastrophe={catastrophe}
            onNext={() => setPhase("roles")}
          />
        )}

        {phase === "roles" && (
          <RoleDistribution
            roles={roles}
            onDone={() => setPhase("discussion")}
          />
        )}

        {phase === "discussion" && (
          <Discussion players={players} onVote={() => setPhase("voting")} />
        )}

        {phase === "voting" && (
          <Voting players={players} onDone={handleVotingDone} />
        )}

        {phase === "results" && (
          <Results
            votes={votes}
            players={players}
            roles={roles}
            onRestart={handleRestart}
          />
        )}
      </div>
    </>
  );
}
