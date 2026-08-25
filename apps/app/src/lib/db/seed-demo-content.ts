import { cmsAbsoluteHttpUrl, type CmsLocaleCopy, type CmsSeoLocaleCopy } from "@/lib/cms-content";
import { isReservedPublicSlug } from "@/lib/cms-pages";

export type DemoPageSeed = {
  slug: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  isPublished: boolean;
  isHomepage: boolean;
  locales: Record<"en" | "ar", CmsLocaleCopy>;
  seoLocales: Record<"en" | "ar", CmsSeoLocaleCopy>;
};

export const DEMO_OG_IMAGE =
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80";

const OG_MAKKAH = DEMO_OG_IMAGE;
const OG_MADINAH =
  "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1600&q=80";
const OG_HOTEL =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";
const OG_NABAWI =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80";

export const DEMO_SETTINGS: Record<string, string> = {
  appName: "Safwah Haramain",
  appDescription:
    "Biro perjalanan Umrah dari Jakarta. Pendampingan mutawwif berbahasa Indonesia, hotel dekat Masjidil Haram dan Masjid Nabawi, serta jadwal keberangkatan yang jelas.",
  contactEmail: "halo@demo.rihla.my.id",
  contactPhone: "+62 21 3891 2200",
  address: "Jl. Kramat Raya No. 45, Senen, Jakarta Pusat 10450",
  currency: "IDR",
  bookingPrefix: "SFH",
};

export const DEMO_PAGES: DemoPageSeed[] = [
  {
    slug: "home",
    title: "Umrah tenang, pendampingan dekat",
    body: [
      "Assalamu'alaikum warahmatullahi wabarakatuh.",
      "",
      "Safwah Haramain mendampingi jamaah dari embarkasi Jakarta ke Makkah dan Madinah. Kami merancang paket agar ibadah tidak terburu-buru: hotel walking distance, mutawwif yang menjelaskan manasik dengan bahasa sehari-hari, dan kuota keberangkatan yang kami umumkan jauh-jauh hari.",
      "",
      "Pilih Umrah Ekonomi 9 hari jika ingin hemat dan tetap nyaman, Plus 12 hari untuk keluarga yang butuh tempo lebih longgar, atau VIP Ramadhan jika ingin ibadah di bulan penuh berkah dengan layanan lebih personal.",
      "",
      "Silakan lihat katalog paket, atau hubungi kantor kami di Senen untuk konsultasi jadwal dan kuota kamar.",
    ].join("\n"),
    seoTitle: "Safwah Haramain — Paket Umrah Jakarta",
    seoDescription:
      "Biro Umrah Jakarta dengan mutawwif Indonesia, hotel dekat Haram, dan keberangkatan terjadwal. Ekonomi, plus, dan VIP Ramadhan.",
    ogImage: OG_MAKKAH,
    isPublished: true,
    isHomepage: true,
    locales: {
      en: {
        title: "A calm Umrah, close accompaniment",
        body: [
          "Assalamu'alaikum warahmatullahi wabarakatuh.",
          "",
          "Safwah Haramain accompanies pilgrims from Jakarta to Makkah and Madinah. We design packages so worship is not rushed: walking-distance hotels, mutawwif who explain the rites in everyday language, and departure quotas announced well in advance.",
          "",
          "Choose the 9-day Economy Umrah if you want to save while staying comfortable, Plus 12 days for families who need a slower pace, or VIP Ramadan if you want worship in the blessed month with more personal service.",
          "",
          "Please browse the package catalog, or visit our office in Senen to discuss schedules and room quotas.",
        ].join("\n"),
      },
      ar: {
        title: "عمرة هادئة ومرافقة قريبة",
        body: [
          "السلام عليكم ورحمة الله وبركاته.",
          "",
          "ترافق صفوة الحرمين الحجاج من جاكرتا إلى مكة والمدينة. نصمم الباقات حتى لا تكون العبادة متعجلة: فنادق قريبة سيراً، ومطوفون يشرحون المناسك بلغة يومية، وحصص مغادرة نعلنها مسبقاً.",
          "",
          "اختاروا عمرة الاقتصاد 9 أيام للتوفير مع الراحة، أو بلس 12 يوماً للعائلات التي تحتاج وتيرة أهدأ، أو VIP رمضان للعبادة في الشهر المبارك بخدمة أكثر خصوصية.",
          "",
          "تصفحوا كتالوج الباقات، أو زوروا مكتبنا في سنين لمناقشة المواعيد وحصص الغرف.",
        ].join("\n"),
      },
    },
    seoLocales: {
      en: {
        title: "Safwah Haramain — Jakarta Umrah packages",
        description:
          "Jakarta Umrah bureau with Indonesian-speaking mutawwif, hotels near the Haram, and scheduled departures. Economy, plus, and VIP Ramadan.",
      },
      ar: {
        title: "صفوة الحرمين — باقات عمرة جاكرتا",
        description:
          "مكتب عمرة في جاكرتا مع مطوفين إندونيسيين، فنادق قرب الحرم، ومغادرات مجدولة. اقتصاد وبلس وVIP رمضان.",
      },
    },
  },
  {
    slug: "about",
    title: "Tentang Safwah Haramain",
    body: [
      "Safwah Haramain berdiri sebagai biro perjalanan ibadah yang fokus pada jamaah Indonesia. Kami bukan agen wisata umum: setiap keberangkatan kami siapkan manasik di Jakarta, briefing bandara, dan pendampingan di Tanah Suci sampai kepulangan.",
      "",
      "Tim kami terdiri dari staf embarkasi, mutawwif, dan petugas hotel yang sudah terbiasa menolong jamaah lansia, keluarga dengan anak, dan jamaah yang baru pertama kali Umrah.",
      "",
      "Kantor kami di Jl. Kramat Raya, Senen, Jakarta Pusat. Datang langsung atau telepon untuk menanyakan sisa kuota, perbedaan hotel, dan apa yang termasuk di masing-masing paket.",
    ].join("\n"),
    seoTitle: "Tentang Safwah Haramain",
    seoDescription:
      "Profil biro Umrah Safwah Haramain di Jakarta Pusat: manasik, mutawwif, dan pendampingan jamaah ke Tanah Suci.",
    ogImage: OG_MADINAH,
    isPublished: true,
    isHomepage: false,
    locales: {
      en: {
        title: "About Safwah Haramain",
        body: [
          "Safwah Haramain is a worship travel bureau focused on Indonesian pilgrims. We are not a general tour agency: every departure includes manasik in Jakarta, airport briefing, and accompaniment in the Holy Land until return.",
          "",
          "Our team includes embarkation staff, mutawwif, and hotel officers used to helping elderly pilgrims, families with children, and first-time Umrah travelers.",
          "",
          "Our office is on Jl. Kramat Raya, Senen, Central Jakarta. Visit or call to ask about remaining quotas, hotel differences, and what each package includes.",
        ].join("\n"),
      },
      ar: {
        title: "عن صفوة الحرمين",
        body: [
          "صفوة الحرمين مكتب سفر للعبادة يركز على الحجاج الإندونيسيين. لسنا وكالة سياحة عامة: كل مغادرة تشمل مناسك في جاكرتا، وإحاطة في المطار، ومرافقة في الأرض المقدسة حتى العودة.",
          "",
          "فريقنا يشمل موظفي الإركاب والمطوفين ومسؤولي الفندق المعتادين على مساعدة كبار السن والعائلات وأول مرة يعتمرون.",
          "",
          "مكتبنا في شارع كرامات رايا، سنين، جاكرتا الوسطى. زورونا أو اتصلوا لسؤال الحصص المتبقية وفروق الفنادق وما يشمله كل باقة.",
        ].join("\n"),
      },
    },
    seoLocales: {
      en: {
        title: "About Safwah Haramain",
        description:
          "Profile of Safwah Haramain Umrah bureau in Central Jakarta: manasik, mutawwif, and pilgrim accompaniment to the Holy Land.",
      },
      ar: {
        title: "عن صفوة الحرمين",
        description:
          "نبذة عن مكتب عمرة صفوة الحرمين في جاكرتا الوسطى: المناسك والمطوف ومرافقة الحجاج إلى الأرض المقدسة.",
      },
    },
  },
  {
    slug: "contact",
    title: "Hubungi kantor kami",
    body: [
      "Kantor: Jl. Kramat Raya No. 45, Senen, Jakarta Pusat 10450",
      "Telepon / WhatsApp: +62 21 3891 2200",
      "Email: halo@demo.rihla.my.id",
      "",
      "Jam layanan: Senin–Jumat 09.00–17.00 WIB, Sabtu 09.00–13.00 WIB. Minggu dan hari libur nasional tutup, kecuali H-2 keberangkatan (tim embarkasi siaga).",
      "",
      "Untuk tanya kuota kamar atau cicilan, sebutkan nama paket dan bulan keberangkatan yang diminati agar staf kami bisa cek sisa seat.",
    ].join("\n"),
    seoTitle: "Kontak Safwah Haramain Jakarta",
    seoDescription:
      "Alamat kantor Senen, telepon, dan jam layanan Safwah Haramain untuk konsultasi paket Umrah.",
    ogImage: OG_HOTEL,
    isPublished: true,
    isHomepage: false,
    locales: {
      en: {
        title: "Contact our office",
        body: [
          "Office: Jl. Kramat Raya No. 45, Senen, Central Jakarta 10450",
          "Phone / WhatsApp: +62 21 3891 2200",
          "Email: halo@demo.rihla.my.id",
          "",
          "Hours: Monday–Friday 09.00–17.00 WIB, Saturday 09.00–13.00 WIB. Closed Sundays and national holidays, except two days before departure (embarkation team on standby).",
          "",
          "For room quota or installment questions, mention the package name and preferred departure month so staff can check remaining seats.",
        ].join("\n"),
      },
      ar: {
        title: "تواصلوا مع مكتبنا",
        body: [
          "المكتب: شارع كرامات رايا رقم 45، سنين، جاكرتا الوسطى 10450",
          "هاتف / واتساب: +62 21 3891 2200",
          "البريد: halo@demo.rihla.my.id",
          "",
          "ساعات العمل: الإثنين–الجمعة 09.00–17.00 بتوقيت جاكرتا، السبت 09.00–13.00. مغلق الأحد والعطل الرسمية، إلا قبل المغادرة بيومين (فريق الإركاب في الاستعداد).",
          "",
          "لسؤال حصص الغرف أو الأقساط، اذكروا اسم الباقة وشهر المغادرة المطلوب حتى يتحقق الموظفون من المقاعد المتبقية.",
        ].join("\n"),
      },
    },
    seoLocales: {
      en: {
        title: "Contact Safwah Haramain Jakarta",
        description:
          "Senen office address, phone, and hours for Safwah Haramain Umrah package consultation.",
      },
      ar: {
        title: "اتصال صفوة الحرمين جاكرتا",
        description: "عنوان مكتب سنين والهاتف وساعات العمل لاستشارة باقات العمرة.",
      },
    },
  },
  {
    slug: "faq",
    title: "Pertanyaan yang sering ditanya",
    body: [
      "Apakah harga sudah termasuk visa dan tiket pesawat? Ya. Semua paket yang kami tawarkan sudah termasuk visa Umrah, tiket PP embarkasi Jakarta, hotel, bus AC, mutawwif, dan manasik. Yang belum termasuk biasanya asuransi, pengeluaran pribadi, dan kamar single.",
      "",
      "Bolehkah mengubah tanggal keberangkatan? Bisa, selama kuota di bulan pengganti masih ada dan pelunasan belum dikunci ke maskapai. Hubungi kantor paling lambat 21 hari sebelum take-off.",
      "",
      "Bagaimana cara daftar? Pilih paket di halaman Paket, isi data jamaah (paspor masih berlaku minimal 8 bulan), lalu unggah foto. Staf kami akan menghubungi untuk DP dan jadwal manasik.",
      "",
      "Apakah ada mutawwif perempuan? Ada, terutama di keberangkatan yang banyak jamaah ibu-ibu. Minta saat konsultasi agar kami pasangkan tim yang sesuai.",
    ].join("\n"),
    seoTitle: "FAQ Umrah — Safwah Haramain",
    seoDescription:
      "Visa, ubah jadwal, cara daftar, dan mutawwif perempuan di paket Umrah Safwah Haramain.",
    ogImage: OG_NABAWI,
    isPublished: true,
    isHomepage: false,
    locales: {
      en: {
        title: "Frequently asked questions",
        body: [
          "Does the price include visa and airfare? Yes. All packages include Umrah visa, return flights from Jakarta, hotel, AC bus, mutawwif, and manasik. Usually not included: insurance, personal spending, and single rooms.",
          "",
          "Can I change the departure date? Yes, if the replacement month still has quota and payment is not yet locked to the airline. Contact the office at least 21 days before take-off.",
          "",
          "How do I register? Choose a package on the Packages page, fill pilgrim data (passport valid at least 8 months), then upload a photo. Staff will contact you for the deposit and manasik schedule.",
          "",
          "Is there a female mutawwif? Yes, especially on departures with many women. Ask during consultation so we can match the team.",
        ].join("\n"),
      },
      ar: {
        title: "أسئلة شائعة",
        body: [
          "هل السعر يشمل التأشيرة وتذكرة الطيران؟ نعم. كل الباقات تشمل تأشيرة العمرة ورحلة ذهاب وعودة من جاكرتا والفندق والحافلة والمطوف والمناسك. عادة لا يشمل التأمين والمصروف الشخصي والغرفة المفردة.",
          "",
          "هل يمكن تغيير تاريخ المغادرة؟ نعم إذا بقيت حصة في الشهر البديل ولم يُقفل السداد مع شركة الطيران. اتصلوا بالمكتب قبل الإقلاع بـ 21 يوماً على الأقل.",
          "",
          "كيف أسجّل؟ اختاروا باقة من صفحة الباقات، املؤوا بيانات الحاج (جواز صالح 8 أشهر على الأقل)، ثم ارفعوا صورة. سيتواصل الموظفون للدفع المقدم وموعد المناسك.",
          "",
          "هل يوجد مطوفة؟ نعم، خاصة في المغادرات التي يكثر فيها النساء. اطلبوا ذلك عند الاستشارة لنلائم الفريق.",
        ].join("\n"),
      },
    },
    seoLocales: {
      en: {
        title: "Umrah FAQ — Safwah Haramain",
        description:
          "Visa, schedule changes, how to register, and female mutawwif on Safwah Haramain Umrah packages.",
      },
      ar: {
        title: "أسئلة العمرة — صفوة الحرمين",
        description: "التأشيرة وتغيير الموعد وطريقة التسجيل والمطوفة في باقات صفوة الحرمين.",
      },
    },
  },
];

const LAB_COPY = /white-?label|cms|lab rihla|availableDates|published\.|Biro Demo/i;

export function assertDemoPagesSafe(pages: DemoPageSeed[] = DEMO_PAGES): void {
  const slugs = new Set<string>();
  let homepages = 0;
  for (const page of pages) {
    const slug = page.slug.trim().toLowerCase();
    if (!slug) {
      throw new Error("Demo CMS page slug is empty");
    }
    if (isReservedPublicSlug(slug)) {
      throw new Error(`Demo CMS slug "${slug}" collides with a reserved public route`);
    }
    if (slugs.has(slug)) {
      throw new Error(`Duplicate demo CMS slug "${slug}"`);
    }
    slugs.add(slug);
    if (!cmsAbsoluteHttpUrl(page.ogImage)) {
      throw new Error(`Demo CMS slug "${slug}" has invalid ogImage URL`);
    }
    const locBlob = ["en", "ar"]
      .map(
        (loc) =>
          `${page.locales[loc as "en" | "ar"].title}\n${page.locales[loc as "en" | "ar"].body}\n${page.seoLocales[loc as "en" | "ar"].title}\n${page.seoLocales[loc as "en" | "ar"].description}`,
      )
      .join("\n");
    const blob = `${page.title}\n${page.body}\n${page.seoTitle}\n${page.seoDescription}\n${locBlob}`;
    if (LAB_COPY.test(blob)) {
      throw new Error(`Demo CMS slug "${slug}" still contains lab/internal copy`);
    }
    if (page.isHomepage) homepages += 1;
  }
  if (homepages !== 1) {
    throw new Error(`Demo CMS seed must have exactly one homepage, got ${homepages}`);
  }
}
