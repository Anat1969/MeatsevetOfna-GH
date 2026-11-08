// תפאורות מסלול 2026. רק מה שמופיע בכתבות שבמקורות. התמונות: תמונת השער של הכתבה (og:image), שמורה בדלי, עם קרדיט וקישור לאתר.
export type SetEntry = { house: string; city_he: string; city_en: string; venue: string; idea: string; lesson: string; kind: 'מים' | 'נוף' | 'מבנה' | 'שמיים' | 'ארכיון' | 'חומר'; image?: string; credit?: { label: string; url: string } };
const IMG = 'https://ktqmwpbzcnzkhjskqisy.supabase.co/storage/v1/object/public/mo-media/sets/';
export type Season = { id: string; title: string; sub: string; entries: SetEntry[]; sources: { label: string; url: string }[] };

export const SEASONS: Season[] = [
  {
    id: 'fw26', title: 'סתיו-חורף 2026', sub: 'Fall/Winter 2026, פריז ולונדון',
    entries: [
      { house: 'Dior', city_he: 'פריז', city_en: 'Paris', venue: 'Bassin Octogonal, Jardin des Tuileries',
        idea: 'חממת זכוכית סביב הבריכה בגני הטווילרי, מסלול שמקיף את המים, וחבצלות מים **מלאכותיות** שצפות על פני הבריכה.',
        image: IMG + 'fw26-dior.jpg', credit: { label: 'Whitewall', url: 'https://whitewall.art/fashion/autumn-winter-2026-jonathan-anderson-reimagines-dior/' },
        lesson: 'מסלול שמקיף מוקד במקום קו ישר: הקהל רואה את הבגד מכל צד.', kind: 'מים' },
      { house: 'Louis Vuitton', city_he: 'פריז', city_en: 'Paris', venue: 'Cour Carrée, Musée du Louvre',
        idea: 'נוף מכוסה טחב בחצר הלובר, בעיצוב **ג\'רמי הינדל** (Jeremy Hindle). טבע מופשט כמבט על המחר.',
        lesson: 'להביא נוף אל תוך מבנה היסטורי: הניגוד בין אבן לצמח הוא הסיפור.', kind: 'נוף',
        image: IMG + 'fw26-lv.webp', credit: { label: 'Marie Claire Australia', url: 'https://www.marieclaire.com.au/fashion/runway/louis-vuitton-autumn-winter-2026-show-review/' } },
      { house: 'Chanel', city_he: 'פריז', city_en: 'Paris', venue: 'Grand Palais',
        idea: 'עגורנים מלוכים בצבעי יסוד בתוך הגרנד פאלה, שהופכים את האולם ל**אתר בנייה** סוריאליסטי.',
        lesson: 'מבנה שעוד לא נגמר: הקולקציה כתהליך ולא כתוצר.', kind: 'מבנה',
        image: IMG + 'fw26-chanel.jpg', credit: { label: 'designboom', url: 'https://www.designboom.com/design/towering-cranes-grand-palais-construction-site-chanel-fw26-runway-bureau-betak/' } },
      { house: 'Burberry', city_he: 'לונדון', city_en: 'London', venue: 'Old Billingsgate',
        idea: 'צריחי **גשר המצודה** (Tower Bridge) מפורקים לקוביות משחק ועטופים בפיגומים.',
        lesson: 'סמל של עיר מפורק לרכיבים: המקום כחומר עיצוב.', kind: 'מבנה',
        image: IMG + 'fw26-burberry.jpg', credit: { label: 'Whitewall', url: 'https://whitewall.art/fashion/london-fashion-week-winter-2026-burberry/' } },
      { house: 'Diesel', city_he: 'מילאנו', city_en: 'Milan', venue: 'Superstudio Maxi',
        idea: 'כ-**50,000** פריטים מהארכיון של המותג, ערומים כתפאורה.',
        lesson: 'הזיכרון של המותג הוא הקיר: עבר כחומר גלם.', kind: 'ארכיון',
        image: IMG + 'fw26-diesel.jpg', credit: { label: 'The Impression', url: 'https://theimpression.com/diesel-fall-2026-fashion-show-review/' } },
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
        idea: 'כוכבי לכת מוארים תלויים מעל מסלול מבריק, כמו **מערכת השמש** בלילה. התפאורה של Bureau Betak.',
        lesson: 'התקרה היא חלק מהבמה: מבט למעלה משנה את קנה המידה.', kind: 'שמיים',
        image: IMG + 'ss26-chanel.jpg', credit: { label: 'designboom', url: 'https://www.designboom.com/design/constellation-floating-orbs-paris-grand-palais-chanel-ss26-show-matthieu-blazy-10-07-2025/' } },
      { house: 'Khaite', city_he: 'ניו יורק', city_en: 'New York', venue: 'New York',
        idea: 'בריכה שחורה עם אדים, ומסלולים זוויתיים מעל **מים דוממים**. עיצוב: גריפין פרייזן (Griffin Frazen).',
        lesson: 'השתקפות מכפילה את הלוק: כל צעד נראה פעמיים.', kind: 'מים',
        image: IMG + 'ss26-khaite.jpg', credit: { label: 'Wallpaper', url: 'https://www.wallpaper.com/fashion-beauty/khaite-ss-2026-runway-set-nyfw-griffin-frazen-interview' } },
      { house: 'Fendi', city_he: 'מילאנו', city_en: 'Milan', venue: 'Milan',
        idea: 'קוביות שוות ב-**101 צבעים**, שבונות מדרגות ישיבה סביב מסלול מתפתל. עיצוב: מארק ניוסון (Marc Newson).',
        lesson: 'דוגמית הבד כאבן בניין של החלל.', kind: 'חומר',
        image: IMG + 'ss26-fendi.jpg', credit: { label: 'Dezeen', url: 'https://www.dezeen.com/2025/09/29/marc-newson-fendi-ss26-runway/' } },
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
