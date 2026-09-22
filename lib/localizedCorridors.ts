import type { FaqItem } from "@/lib/corridorContent";

/**
 * Phase 5 — Flat static localization dictionary.
 *
 * Five hand-authored language variants exist for the highest-query corridors.
 * Each entry powers a static sub-path rendered at build time via
 * `app/[lang]/calculator/[slug]/page.tsx` (`generateStaticParams`), so the
 * localized HTML ships as plain files in `./out` with hreflang alternates
 * wired into the English corridor pages. No `next.config` localization, no
 * proxy, no runtime negotiation — pure static export.
 */

export interface LocalizedCorridor {
  lang: string;
  /** Corridor slug this variant renders (its twin `calculator/[slug]`). */
  slug: string;
  /** Text direction for typographic polish (Urdu is RTL). */
  dir: "rtl" | "ltr";
  /** ISO 639-1 language used for `lang`, `hreflang` and `<div lang>`. */
  localeName: string;
  /** Metadata <title>. */
  title: string;
  /** Metadata description. */
  description: string;
  /** Small eyebrow label above the H1. */
  eyebrow: string;
  /** H1 headline in the target language. */
  headline: string;
  /** Lead paragraph under the H1. */
  intro: string;
  /** Three localized compliance takeaways. */
  bullets: string[];
  /** Two localized Q&A entries (rendered + mirrored as FAQPage JSON-LD). */
  faqs: FaqItem[];
  /** Footer note shown on the localized page. */
  note: string;
}

export const LOCALIZED_CORRIDORS: LocalizedCorridor[] = [
  {
    lang: "ur",
    slug: "usd-to-pkr",
    dir: "rtl",
    localeName: "Urdu",
    title: "ڈالر سے روپے کی ریمیٹنس — پاکستان فری لانس ٹیکس گائیڈ",
    description:
      "پاکستان میں فری لانس پے آؤٹ کی فیس، FX اسپریڈ اور ٹیکس کا مکمل موازنہ۔ PSEB 0.25%، PRC سرٹیفکیٹ اور SBP مقصد کوڈ 9110 کی رہنمائی۔",
    eyebrow: "پاکستان ریمیٹنس راستہ",
    headline:
      "پاکستان فری لانس ریمیٹنس — فیس، اسپریڈ اور ٹیکس کا مکمل حساب",
    intro:
      "فری لانس کمائی کو پاکستانی روپے میں بدلنے کے راستے میں تین نقصانات ہوتے ہیں: پلیٹ فارم کا کمیشن، چینل کی فکس فیس، اور خفیہ ایکسچینج اسپریڈ۔ یہ صفحہ تینوں کا حساب روپے میں پیش کرتا ہے تاکہ آپ جانتے ہوئے راستہ منتخب کر سکیں۔",
    bullets: [
      "PSEB رجسٹرڈ IT/ITeS برآمد کنندگان کے لیے FBR دفعہ 154A کے تحت 0.25% رعایتی حتمی ودہولڈنگ ٹیکس لاگو ہے۔",
      "بینک سے آمدنی کی تصدیق کے لیے پروسیڈز ریئلائزیشن سرٹیفکیٹ (PRC / e-PRC) لازمی ہے — HBL، میزان، الفلاح جیسے ملکی بینک جاری کرتے ہیں۔",
      "وائر کا مقصد درج کروائیں: پرس کوڈ 9110 (ٹیلی کمیونیکیشن / کمپیوٹر انفارمیشن سروسز)۔",
    ],
    faqs: [
      {
        q: "کیا پاکستان میں Upwork سے نکاسی پر ٹیکس دینا پڑتا ہے؟",
        a: "جی ہاں — برآمدِ خدمات کی یہ آمدنی پاکستان میں ٹیکس کے دائرے میں ہے۔ PSEB رجسٹریشن اور فائلر اسٹیٹس کے مطابق 0.25% کی رعایتی شرح (FBR دفعہ 154A) یا عام سلابر شرح لگتی ہے؛ حتمی صورتحال کی تصدیق کسی چارٹرڈ اکاؤنٹنٹ سے کریں۔",
      },
      {
        q: "میں اپنا PRC (تصدیقی نامہ) بینک سے کیسے حاصل کروں؟",
        a: "ڈالر کی رقم اکاؤنٹ میں آنے کے بعد اپنے بینک (HBL، میزان، الفلاح وغیرہ) سے پرس کوڈ 9110 کے ساتھ e-PRC کی درخواست کریں؛ اکثر بینک شاخ یا برآمدی پورٹل سے اسی روز جاری کر دیتے ہیں۔",
      },
    ],
    note:
      "یہ معلومات صرف رہنمائی کے لیے ہیں — مالی، ٹیکس یا قانونی مشورہ نہیں۔",
  },
  {
    lang: "hi",
    slug: "usd-to-inr",
    dir: "ltr",
    localeName: "Hindi",
    title: "USD से INR रिमिटेंस — भारत फ्रीलांस टैक्स व GST गाइड",
    description:
      "भारत में फ्रीलांस पेआउट की फीस, FX स्प्रेड और टैक्स की पूरी तुलना। FEMA, FIRC, LUT जीएसटी छूट और Form 67 की जानकारी।",
    eyebrow: "भारत रिमिटेंस रूट",
    headline: "अमेरिकी डॉलर से रुपया — फीस, स्प्रेड और टैक्स का पूरा हिसाब",
    intro:
      "फ्रीलांस कमाई को रुपये में बदलते समय तीन नुकसान होते हैं — प्लेटफ़ॉर्म कमीशन, चैनल की तय फ़ीस और छिपा हुआ FX स्प्रेड। यह पेज तीनों का हिसाब रुपये में दिखाता है, ताकि आप सही निकासी का रास्ता चुन सकें।",
    bullets: [
      "सेवाओं के निर्यात पर 0% GST के लिए वैध Letter of Undertaking (LUT) दाखिल करें; विदेशी कर क्रेडिट के लिए Form 67 भरें।",
      "विदेश से आने वाली रकम का प्रमाण FIRC (Foreign Inward Remittance Certificate) और FIRS स्टेटमेंट है, जो AD-I बैंक जारी करते हैं।",
      "FEMA के तहत निर्यात आय की समय पर बैंक से मिलान रिपोर्ट रखें; इनवर्ड रिमिटेंस का विवरण रिटर्न से जुड़ा रहना चाहिए।",
    ],
    faqs: [
      {
        q: "क्या Upwork से मिले पैसों पर टैक्स लगता है?",
        a: "हां — फ्रीलांस आय भारत में कर योग्य है; §44ADA की प्रेज़म्प्टिव व्यवस्था या सामान्य स्लैब लागू होते हैं। TDS तभी लागू होता है जब भुगतान करने वाला भारतीय इकाई हो।",
      },
      {
        q: "FIRC कैसे मिलेगा?",
        a: "रकम खाते में आने के बाद अपने AD Category-I बैंक से FIRC/FIRS की माँग करें; बैंक इनवर्ड रिमिटेंस विवरण के साथ प्रमाणपत्र जारी करता है, जो FEMA सहारण और विदेशी कर क्रेडिट के लिए ज़रूरी है।",
      },
    ],
    note:
      "यह जानकारी केवल मार्गदर्शन के लिए है — वित्तीय, कर या कानूनी सलाह नहीं।",
  },
  {
    lang: "fil",
    slug: "usd-to-php",
    dir: "ltr",
    localeName: "Filipino",
    title: "USD sa PHP remittance — gabay sa buwis ng Filipino freelancer",
    description:
      "Kumpara sa lahat ng bayad, FX spread at buwis sa bawat PHP payout. BSP clearance, BIR Form 1701Q / 2307, at mga limit sa GCash / Maya.",
    eyebrow: "Philippine remittance route",
    headline: "Kita sa USD, dating sa PHP — bayad, spread at buwis ang kumpleto",
    intro:
      "Bawat payout sa PHP ay may tatlong bawas: komisyon ng platform, fixed na bayad ng channel, at nakatagong FX spread. Ipinapakita ng pahinang ito ang buong bawas sa piso upang mapili ang pinakamurang paraan.",
    bullets: [
      "Iulat ang foreign-sourced na kita sa BIR Form 1701Q kada quarter, at i-claim ang withholding gamit ang Form 2307 kung mayroon.",
      "Maaaring magpapadala sa BDO, BPI, UnionBank o sa GCash/Maya — bawat wallet ay may sariling cash-in limit at bayad.",
      "Iwasan ang personal na P2P crypto routing: maaaring i-freeze ng bangko ang account kapag hindi magkatugma ang pinagmulan ng pera.",
    ],
    faqs: [
      {
        q: "Kailangan bang iulat sa BIR ang kita mula sa Upwork o Fiverr?",
        a: "Oo — ang kita mula sa mga serbisyo habang ikaw ay residente ng Pilipinas ay taxable kahit taga-ibang bansa ang kliyente. I-ulat sa BIR Form 1701Q at i-keep ang bank evidence ng remittance.",
      },
      {
        q: "Pwede bang i-cash out nang direkta sa GCash o Maya?",
        a: "Pwede sa mga limit na itinakda ng BSP, ngunit may per-transaction na cap at cash-out na bayad; para sa malalaking bayad, halos palaging mas mura ang bank account.",
      },
    ],
    note:
      "Ang impormasyong ito ay gabay lamang — hindi payong pinansyal, buwis o legal.",
  },
  {
    lang: "es",
    slug: "usd-to-eur",
    dir: "ltr",
    localeName: "Spanish",
    title: "Remesa USD a EUR — auditoría de comisiones para freelancers",
    description:
      "Audita comisiones, spread SEPA y fiscalidad al cobrar en euros. PSD2, reverse charge de IVA y referencia ECB para freelancers.",
    eyebrow: "Ruta de remesa europea",
    headline: "Cobros en euros: cada comisión, cada spread y un solo vistazo",
    intro:
      "Cada pago en EUR sufre tres recortes: comisión de la plataforma, tarifa fija del canal y spread de conversión oculto. Esta página desglosa los tres en euros para que elijas la ruta con menor pérdida.",
    bullets: [
      "Los ingresos por servicios a clientes extranjeros son renta gravable en tu país de residencia; conserva facturas y extractos bancarios.",
      "SEPA Credit Transfer llega al día siguiente y SEPA Instant en segundos; el cuello de botella es la conversión USD→EUR.",
      "Para servicios B2B entre empresas de la UE suele aplicarse la inversión del sujeto pasivo (reverse charge) del IVA: el cliente declara el IVA, no tú.",
    ],
    faqs: [
      {
        q: "¿Tengo que declarar los ingresos de Upwork en mi país?",
        a: "Sí — los residentes tributan por su renta mundial. Declara los servicios prestados al extranjero en moneda local usando un tipo de cambio razonable y constante, y conserva la factura y el aviso bancario.",
      },
      {
        q: "¿Necesito un certificado de remesa inward?",
        a: "El aviso de crédito bancario que acredita la entrada de divisas suele bastar; algunos bancos emiten un certificado bajo petición que refuerza la trazabilidad ante la fiscalidad.",
      },
    ],
    note: "Información orientativa — no es asesoramiento financiero, fiscal ni legal.",
  },
  {
    lang: "pt",
    slug: "usd-to-brl",
    dir: "ltr",
    localeName: "Portuguese",
    title: "Remessa USD a BRL — auditoria de tarifas para freelancers",
    description:
      "Audite tarifas, spread de câmbio e IOF ao receber em reais. PIX, IRPF e regras do Banco Central para freelancers.",
    eyebrow: "Rota de remessa brasileira",
    headline: "Recebendo em reais: IOF, PIX e o custo real do câmbio",
    intro:
      "Cada recebimento em BRL passa por três descontos: comissão da plataforma, taxa fixa do canal e spread de câmbio oculto. Esta página mostra os três em reais para escolher a rota com menor perda.",
    bullets: [
      "IOF incide sobre a operação de câmbio (tipicamente 0,38% em conversões padrão); alguns provedores o embutem no spread.",
      "Renda de exportação de serviços é tributável no IRPF; guarde os comprovantes PIX/TED do recebimento e a fatura do cliente.",
      "A conversão deve passar por instituição licenciada pelo Banco Central — casas informais não servem para renda declarável.",
    ],
    faqs: [
      {
        q: "Preciso declarar a remessa no imposto de renda?",
        a: "Sim — a renda do exterior é tributável para residentes. Guarde extratos, comprovantes e a taxa de câmbio utilizada na conversão, e declare-a no ajuste anual.",
      },
      {
        q: "Como recebo o comprovante da remessa?",
        a: "Peça ao banco o comprovante da entrada em USD e da conversão para BRL (contrato de câmbio ou aviso de crédito); ambos sustentam a declaração em caso de malha fina.",
      },
    ],
    note: "Informação meramente orientativa — não é aconselhamento financeiro, fiscal ou jurídico.",
  },
];

/** Resolves the localized variant for a `(lang, slug)` pair, if authored. */
export function getLocalizedCorridor(
  lang: string,
  slug: string,
): LocalizedCorridor | undefined {
  return LOCALIZED_CORRIDORS.find(
    (item) => item.lang === lang && item.slug === slug,
  );
}

/** Resolves the localized variant for a corridor slug, if one exists. */
export function getLocalizedForSlug(
  slug: string,
): LocalizedCorridor | undefined {
  return LOCALIZED_CORRIDORS.find((item) => item.slug === slug);
}

/** True when the corridor slug has at least one authored localized variant. */
export function hasLocalizedVariant(slug: string): boolean {
  return LOCALIZED_CORRIDORS.some((item) => item.slug === slug);
}

/**
 * Hreflang cluster for a corridor page. Every member page of a cluster —
 * English and localized alike — lists the full set so crawlers see one
 * consistent language group. Returns `undefined` for corridors with no
 * authored variant (their pages emit no hreflang block).
 */
export function hreflangMap(slug: string): Record<string, string> | undefined {
  const localized = getLocalizedForSlug(slug);
  if (!localized) return undefined;
  return {
    "x-default": `/calculator/${slug}/`,
    en: `/calculator/${slug}/`,
    [localized.lang]: `/${localized.lang}/calculator/${slug}/`,
  };
}