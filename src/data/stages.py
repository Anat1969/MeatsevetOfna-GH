# Builds the three illustration prompts (sketch, model, editorial) for the seed looks. Run: python3 src/data/stages.py
import json
NO = "--style raw --no text, words, writing, frame divisions"
T = {
 "sketch": {
  "en": f"charcoal and black ink fashion design sketch on off-white paper, quick angular gestural strokes, architectural construction lines and faint grid guides extending beyond the figure, faceless elongated figure, planes instead of details, monochrome, Documentary realism, Professional architecture photography, 1:1 --ar 1:1 {NO}",
  "he": f"סקיצת עיצוב אופנה בפחם ודיו שחור על נייר בגוון שמנת, משיכות מהירות וזוויתיות, קווי בנייה אדריכליים וגריד עדין שנמשכים מעבר לדמות, דמות מוארכת בלי פנים, מישורים במקום פרטים, מונוכרום. Documentary realism, Professional architecture photography, 1:1 --ar 1:1 {NO}"},
 "model": {
  "en": f"sculptural fashion form study on a seamless white studio sweep, the figure as a black silhouette mid-stride, the garment as an architectural volume, crisp soft shadow, generous negative space, geometric abstraction, high contrast, Documentary realism, Professional architecture photography, 1:1 --ar 1:1 {NO}",
  "he": f"מחקר צורה פיסולי של הבגד על רקע סטודיו לבן ורציף, הדמות כצללית שחורה באמצע צעד, הבגד כנפח אדריכלי, צל חד ורך, הרבה חלל ריק, הפשטה גאומטרית, ניגודיות גבוהה. Documentary realism, Professional architecture photography, 1:1 --ar 1:1 {NO}"},
 "editorial": {
  "en": f"editorial fashion photograph, shallow depth of field, the background softly blurred yet recognizable, the model in the left third, calm negative space on the right for a magazine headline, natural light, Documentary realism, Professional architecture photography, 16:9 --ar 16:9 {NO}",
  "he": f"צילום אופנה למגזין, עומק שדה רדוד, הרקע מטושטש ברכות אבל מזוהה, הדוגמנית בשליש השמאלי, חלל שקט מימין לכותרת המגזין, אור טבעי. Documentary realism, Professional architecture photography, 16:9 --ar 16:9 {NO}"},
}
LOOKS = {
 1: {"sketch": ("a midi dress, plain and calm at the shoulders, the skirt breaking into deep pleats with hidden godets, a drawstring at the waist",
                "שמלת מידי, שקטה וחלקה בכתפיים, החצאית נשברת לקפלים עמוקים עם גודות נסתרות, שרוך במותן"),
     "model": ("the dress in cream linen, the skirt pleats opening in the stride to reveal dark burgundy godets",
               "השמלה בפשתן שמנת, קפלי החצאית נפתחים בצעד וחושפים גודות בבורדו כהה"),
     "editorial": ("a grounded Israeli woman around 40 wearing a cream linen midi dress, paisley embroidery thickening toward the hem in terracotta and deep teal, burgundy godets opening as she walks, in a Jerusalem stone courtyard in Nachlaot, soft low morning light",
                   "אישה ישראלית כבת 40, יציבה, לובשת שמלת מידי מפשתן שמנת, רקמת פייזלי בטרקוטה וטורקיז שמצטופפת לשוליים, גודות בורדו נפתחות בצעד, בחצר אבן בנחלאות, ירושלים (Nachlaot, Jerusalem), אור בוקר רך ונמוך")},
 2: {"sketch": ("a shirt dress with a broad collar and rolled cuffs, deep patch pockets, a soft tie belt, one inner pleat",
                "שמלת חולצה עם צווארון רחב ושרוולים מקופלים, כיסים עמוקים, חגורת קשירה רכה, קפל פנימי אחד"),
     "model": ("the shirt dress in washed sand cotton, an embroidered collar, the inner pleat flashing burgundy as she moves",
               "שמלת החולצה בכותנה רחוצה בצבע חול, צווארון רקום, הקפל הפנימי מבזיק בבורדו בתנועה"),
     "editorial": ("an Israeli woman around 60 with silver hair tied back wearing a sand cotton shirt dress with a hand-embroidered collar and cuffs, a straw basket on her arm, walking through Levinsky Market, Tel Aviv-Yafo, spice crates and fabric awnings softly blurred behind her, filtered midday light",
                   "אישה ישראלית כבת 60, שיער כסוף אסוף, לובשת שמלת חולצה מכותנה בצבע חול עם צווארון ושרוולים רקומים ביד, סל קש על זרועה, הולכת בשוק לוינסקי, תל אביב-יפו (Levinsky Market, Tel Aviv-Yafo), ארגזי תבלינים וסוככי בד מטושטשים מאחוריה, אור צהריים מסונן")},
 3: {"sketch": ("a dress of layered translucent panels, the top layer sliding off one shoulder, a fallen layer pooled on the floor",
                "שמלה של שכבות שקופות, השכבה העליונה מחליקה מכתף אחת, שכבה שנשרה מונחת על הרצפה"),
     "model": ("the layers in semi-sheer organza and silk, cream, dusty rose and sand, over a skin-tone slip, one layer drifting to the floor",
               "השכבות באורגנזה ומשי שקופים למחצה, שמנת, ורוד אבק וחול, מעל תחתונית בגוון עור, שכבה אחת נושרת אל הרצפה"),
     "editorial": ("an Israeli woman around 30 by an arched window in an old stone house in Ein Karem, Jerusalem, at first dawn, wearing a layered dress of semi-sheer organza and silk in cream and dusty rose over a skin-tone slip, the top layer sliding from her shoulder, the stone room softly blurred, blue-gold light, modest and dignified",
                   "אישה ישראלית כבת 30 ליד חלון קשתי בבית אבן עתיק בעין כרם, ירושלים (Ein Karem, Jerusalem), עם שחר ראשון, לובשת שמלת שכבות מאורגנזה ומשי בשמנת וורוד אבק מעל תחתונית בגוון עור, השכבה העליונה מחליקה מכתפה, חדר האבן מטושטש ברכות, אור כחול-זהוב, צנוע ומכובד")},
}
out = {}
for n, st in LOOKS.items():
  out[n] = {k: {"en": f"{st[k][0]}, {T[k]['en']}", "he": f"{st[k][1]}. {T[k]['he']}"} for k in T}
json.dump(out, open("src/data/stages.json", "w"), ensure_ascii=False, indent=1)
sql = "update mo_looks l set prompts = v.p from (values " + ", ".join(
  f"({n}, '{json.dumps(out[n], ensure_ascii=False).replace(chr(39), chr(39)*2)}'::jsonb)" for n in out) + ") v(n, p) where l.n = v.n and l.collection_id = '0f1e2d3c-0000-4000-8000-000000000001';"
open("/tmp/claude-0/-home-user-MeatsevetOfna-GH/18b77485-d6c6-5898-8c8a-962a6c93ea95/scratchpad/stages.sql", "w").write(sql)
print(len(sql))
