// תפאורות מסלול 2026. רק מה שמופיע בסיכומי העיתונות שבמקורות. לא נבדק מול הודעות המותגים עצמם.
export type SetEntry = { house: string; city_he: string; city_en: string; venue: string; idea: string; lesson: string; kind: 'מים' | 'נוף' | 'מבנה' | 'שמיים' | 'ארכיון' | 'חומר' };
export type Season = { id: string; title: string; sub: string; entries: SetEntry[]; sources: { label: string; url: string }[] };

export const SEASONS: Season[] = [
  {
    id: 'fw26', title: 'סתיו-חורף 2026', sub: 'Fall/Winter 2026, פריז ולונדון',
    entries: [
      { house: 'Dior', city_he: 'פריז', city_en: 'Paris', venue: 'Bassin Octogonal, Jardin des Tuileries',
        idea: 'במה עגולה סביב הבריכה בגני הטווילרי, מסלול שמקיף את המים ב-**360 מעלות**, עם חבצלות מים מלאכותיות.',
        lesson: 'מסלול שמקיף מוקד במקום קו ישר: הקהל רואה את הבגד מכל צד.', kind: 'מים' },
      { house: 'Louis Vuitton', city_he: 'פריז', city_en: 'Paris', venue: 'Cour Carrée, Musée du Louvre',
        idea: 'נוף מכוסה טחב בחצר הלובר, בעיצוב **ג\'רמי הינדל** (Jeremy Hindle). טבע מופשט כמבט על המחר.',
        lesson: 'להביא נוף אל תוך מבנה היסטורי: הניגוד בין אבן לצמח הוא הסיפור.', kind: 'נוף' },
      { house: 'Chanel', city_he: 'פריז', city_en: 'Paris', venue: 'Grand Palais',
        idea: 'עגורנים מלוכים בצבעי יסוד בתוך הגרנד פאלה, שהופכים את האולם ל**אתר בנייה** סוריאליסטי.',
        lesson: 'מבנה שעוד לא נגמר: הקולקציה כתהליך ולא כתוצר.', kind: 'מבנה' },
      { house: 'Burberry', city_he: 'לונדון', city_en: 'London', venue: 'London',
        idea: 'צריחי **גשר המצודה** (Tower Bridge) מפורקים לקוביות משחק ועטופים בפיגומים.',
        lesson: 'סמל של עיר מפורק לרכיבים: המקום כחומר עיצוב.', kind: 'מבנה' },
      { house: 'Diesel', city_he: 'מילאנו', city_en: 'Milan', venue: 'Milan',
        idea: 'כ-**50,000** פריטים מהארכיון של המותג, ערומים כתפאורה.',
        lesson: 'הזיכרון של המותג הוא הקיר: עבר כחומר גלם.', kind: 'ארכיון' },
    ],
    sources: [
      { label: 'The Impression: The Best Runway Sets of Fall 2026', url: 'https://theimpression.com/the-best-runway-sets-of-fall-2026/' },
      { label: 'Wallpaper: A/W 2026 standout runway show sets', url: 'https://www.wallpaper.com/fashion-beauty/best-runway-show-sets-aw-2026' },
      { label: 'A&E Magazine: The Architecture of Fashion Week, A/W 2026', url: 'https://aeworld.com/fashion/the-architecture-of-fashion-week-the-set-design-behind-the-autumn-winter-2026-catwalks/' },
    ],
  },
  {
    id: 'ss26', title: 'אביב-קיץ 2026', sub: 'Spring/Summer 2026',
    entries: [
      { house: 'Chanel', city_he: 'פריז', city_en: 'Paris', venue: 'Grand Palais',
        idea: 'דגם של **מערכת השמש** שמקיף את המסלול מלמעלה.',
        lesson: 'התקרה היא חלק מהבמה: מבט למעלה משנה את קנה המידה.', kind: 'שמיים' },
      { house: 'Khaite', city_he: 'ניו יורק', city_en: 'New York', venue: 'New York',
        idea: 'מסלול מעל **בריכת מראה** דוממת.',
        lesson: 'השתקפות מכפילה את הלוק: כל צעד נראה פעמיים.', kind: 'מים' },
      { house: 'Fendi', city_he: 'מילאנו', city_en: 'Milan', venue: 'Milan',
        idea: 'מיצב פיקסלים בצורת דוגמיות בד, בשיתוף המעצב **מארק ניוסון** (Marc Newson).',
        lesson: 'דוגמית הבד כאבן בניין של החלל.', kind: 'חומר' },
    ],
    sources: [
      { label: 'The Impression: The Best Runway Sets of Spring 2026', url: 'https://theimpression.com/the-best-runway-sets-of-spring-2026/' },
      { label: 'Wallpaper: Standout shows of Paris Fashion Week S/S 2026', url: 'https://www.wallpaper.com/fashion-beauty/standout-shows-paris-fashion-week-ss-26-best-of' },
      { label: 'La Forma: SS26 runways, the best sets', url: 'https://laforma.club/spring-summer-2026-runways-best-sets/' },
      { label: 'Trend Hunter: Fendi and Marc Newson, SS26', url: 'https://www.trendhunter.com/trends/pixelated' },
      { label: 'Visi: Nature-inspired runway sets of 2026', url: 'https://visi.co.za/nature-inspired-runway-scenography-2026/' },
    ],
  },
];

export const KIND_COLOR: Record<SetEntry['kind'], string> = {
  'מים': '#2F7F7A', 'נוף': '#5E7A3A', 'מבנה': '#B5523B', 'שמיים': '#3B4F8A', 'ארכיון': '#7A6A55', 'חומר': '#5E1F24',
};
