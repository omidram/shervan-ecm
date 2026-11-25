import type { ModuleId } from "./accounts";

export type SectionView =
  | "org"
  | "engines"
  | "transfers"
  | "installs"
  | "utilization"
  | "status"
  | "samples"
  | "compare"
  | "components"
  | "removals"
  | "faults"
  | "defects"
  | "plans"
  | "records"
  | "documents"
  | "fields"
  | "users"
  | "audit"
  | "gaps"
  | "counts"
  | "cost"
  | "parameters"
  | "none";

export type MenuLeaf = {
  slug: string;
  fa: string;
  en: string;
  to?: string;
  view?: SectionView;
  recordType?: string;
  released?: boolean;
  noteFa?: string;
  noteEn?: string;
};

export type MenuGroup = {
  id: string;
  module: ModuleId;
  fa: string;
  en: string;
  items: MenuLeaf[];
};

const E = (path: string) => `:engine${path}`;

export const MENU: MenuGroup[] = [
  {
    id: "dash",
    module: "dashboard",
    fa: "داشبورد مدیریتی",
    en: "Dashboard",
    items: [
      { slug: "executive", fa: "داشبورد مدیران ارشد", en: "Executive Dashboard", to: "/desk" },
      { slug: "fleet-dashboard", fa: "وضعیت کلی ناوگان", en: "Fleet Dashboard", to: "/fleet" },
      { slug: "engine-health", fa: "وضعیت سلامت موتورها", en: "Engine Health Dashboard", to: E("/gas-path") },
      { slug: "performance-dashboard", fa: "شاخص‌های عملکردی", en: "Performance Dashboard", to: E("/performance") },
      { slug: "maintenance-dashboard", fa: "وضعیت تعمیرات", en: "Maintenance Dashboard", to: E("/maintenance") },
      { slug: "alerts", fa: "هشدارها و اعلان‌ها", en: "Alerts & Notifications", to: "/m/alert" },
      { slug: "recent", fa: "آخرین فعالیت‌های ثبت‌شده", en: "Recent Activities", view: "audit" },
    ],
  },
  {
    id: "org",
    module: "dashboard",
    fa: "سازمان و ناوگان",
    en: "Organization & Fleet",
    items: [
      { slug: "organization", fa: "تعریف و مدیریت شرکت‌ها", en: "Organization Management", view: "org" },
      { slug: "overview", fa: "نمای کلی ناوگان", en: "Fleet Overview", to: "/fleet" },
      { slug: "register", fa: "فهرست موتورهای ناوگان", en: "Fleet Register", to: "/fleet/register" },
      { slug: "ownership", fa: "وضعیت مالکیت موتورها", en: "Fleet Ownership", to: "/history" },
      { slug: "lease", fa: "مدیریت اجاره و قراردادها", en: "Lease Management", view: "transfers", noteFa: "آنچه ذخیره شده، انتقال مالکیت همین شرکت است. قرارداد جداگانه‌ای در پایگاه نیست.", noteEn: "What is stored is this company's ownership transfers. No separate contract file is in the database." },
      { slug: "deployment", fa: "وضعیت استقرار و تخصیص موتورها", en: "Fleet Deployment", to: "/fleet/deployment" },
      { slug: "utilization", fa: "میزان بهره‌برداری ناوگان", en: "Fleet Utilization", to: "/fleet/utilization" },
      { slug: "compare", fa: "مقایسه عملکرد موتورها", en: "Fleet Performance Comparison", view: "compare" },
      { slug: "reports", fa: "گزارش‌های ناوگان", en: "Fleet Reports", to: "/reports" },
    ],
  },
  {
    id: "passport",
    module: "passport",
    fa: "شناسنامه دیجیتال موتور",
    en: "Engine Digital Passport",
    items: [
      { slug: "identification", fa: "مشخصات شناسایی موتور", en: "Engine Identification", to: E("") },
      { slug: "history", fa: "تاریخچه مالکیت و بهره‌برداری", en: "Ownership & Operational History", to: "/history" },
      { slug: "configuration", fa: "مشخصات و پیکربندی موتور", en: "Engine Configuration", to: E("/configuration") },
      { slug: "specifications", fa: "مشخصات فنی", en: "Engine Technical Specifications", to: "/knowledge" },
      { slug: "life", fa: "خلاصه عمر و کارکرد", en: "Engine Life Summary", to: E("/operations") },
      { slug: "installation", fa: "تاریخچه نصب و جداسازی", en: "Engine Installation History", view: "installs" },
      { slug: "status", fa: "تاریخچه تغییر وضعیت", en: "Engine Status History", view: "status" },
      { slug: "records", fa: "سوابق جامع موتور", en: "Engine Records", to: "/documents" },
    ],
  },
  {
    id: "configuration",
    module: "configuration",
    fa: "پیکربندی موتور",
    en: "Engine Configuration",
    items: [
      { slug: "rating", fa: "مدل و ریتینگ موتور", en: "Engine Model & Rating", to: "/knowledge" },
      { slug: "hardware", fa: "پیکربندی سخت‌افزاری", en: "Hardware Configuration", to: E("/configuration") },
      { slug: "software", fa: "نسخه نرم‌افزارهای کنترلی، در صورت کاربرد", en: "Software Configuration", view: "engines", noteFa: "اگر نسخه نرم‌افزار کنترلی ذخیره نشده باشد، فقط رشته پیکربندی موجود نشان داده می‌شود.", noteEn: "Where no control-software revision is stored, only the configuration string on the engine is shown." },
      { slug: "modification", fa: "وضعیت اصلاحات", en: "Modification Status", to: "/m/directive" },
      { slug: "sb", fa: "وضعیت SB", en: "Service Bulletin Status", to: "/m/directive" },
      { slug: "ad", fa: "وضعیت AD", en: "Airworthiness Directive Status", to: "/m/directive" },
      { slug: "history", fa: "تاریخچه تغییرات پیکربندی", en: "Configuration History", to: E("/configuration") },
      { slug: "compliance", fa: "انطباق پیکربندی با الزامات", en: "Configuration Compliance", to: "/m/directive" },
    ],
  },
  {
    id: "genealogy",
    module: "genealogy",
    fa: "شجره‌نامه و ردیابی قطعات",
    en: "Component Genealogy",
    items: [
      { slug: "register", fa: "فهرست قطعات", en: "Component Register", to: E("/configuration") },
      { slug: "identification", fa: "شناسایی قطعات", en: "Component Identification", view: "components" },
      { slug: "serial", fa: "ردیابی شماره سریال", en: "Component Serial Number Tracking", view: "components" },
      { slug: "installation", fa: "تاریخچه نصب", en: "Component Installation History", view: "components" },
      { slug: "removal", fa: "تاریخچه جداسازی", en: "Component Removal History", view: "removals" },
      { slug: "ownership", fa: "مالکیت قطعات", en: "Component Ownership", view: "components", noteFa: "مالک ثبت‌شده، مالک موتوری است که قطعه روی آن نصب شده.", noteEn: "The stored owner is the owner of the engine the part is fitted to." },
      { slug: "llp", fa: "مدیریت قطعات دارای محدودیت عمر", en: "LLP Management", to: "/m/llp" },
      { slug: "life", fa: "پایش عمر قطعات", en: "Component Life Tracking", to: "/m/llp" },
      { slug: "movement", fa: "تاریخچه جابه‌جایی", en: "Component Movement History", view: "removals" },
      { slug: "traceability", fa: "ردیابی اصالت و سوابق", en: "Component Traceability", view: "components" },
    ],
  },
  {
    id: "performance",
    module: "health",
    fa: "پایش عملکرد موتور",
    en: "Performance Monitoring",
    items: [
      { slug: "overview", fa: "نمای کلی عملکرد", en: "Performance Overview", to: E("/performance") },
      { slug: "reference", fa: "بانک اطلاعات عملکرد مرجع", en: "Performance Reference Database", to: "/knowledge" },
      { slug: "baseline", fa: "خط مبنای عملکرد", en: "Performance Baseline", to: "/knowledge" },
      { slug: "parameters", fa: "پارامترهای عملکردی", en: "Engine Operating Parameters", view: "parameters" },
      { slug: "flight", fa: "پایش داده‌های پروازی موتور", en: "Flight Data Monitoring", view: "samples", noteFa: "اتصال زنده به داده پرواز وجود ندارد. فقط نمونه‌های ذخیره‌شده همین شرکت نشان داده می‌شود.", noteEn: "No live flight-data feed is connected. Only this company's stored samples are shown." },
      { slug: "test-cell", fa: "اطلاعات تست موتور", en: "Engine Test Cell Data", to: "/m/testcell" },
      { slug: "normalization", fa: "تصحیح و نرمال‌سازی داده‌ها", en: "Performance Normalization", to: E("/performance") },
      { slug: "egt", fa: "پایش حاشیه EGT", en: "EGT Margin Monitoring", to: E("/performance") },
      { slug: "fuel", fa: "پایش مصرف سوخت", en: "Fuel Flow Monitoring", to: "/m/fuel" },
      { slug: "speeds", fa: "پایش دور محورها", en: "N1 / N2 Monitoring", to: "/m/indication" },
      { slug: "degradation", fa: "تحلیل افت عملکرد", en: "Performance Degradation", to: E("/performance") },
      { slug: "trend", fa: "تحلیل روند عملکرد", en: "Performance Trend Analysis", to: E("/performance") },
      { slug: "reports", fa: "گزارش‌های عملکرد", en: "Performance Reports", to: "/reports" },
    ],
  },
  {
    id: "health",
    module: "health",
    fa: "تحلیل سلامت موتور",
    en: "Engine Health Analytics",
    items: [
      { slug: "overview", fa: "نمای کلی سلامت موتور", en: "Engine Health Overview", to: E("/gas-path") },
      { slug: "index", fa: "شاخص درصد سلامت", en: "Engine Health Index", to: E("/gas-path") },
      { slug: "structural", fa: "ارزیابی سلامت ساختاری", en: "Structural Health Assessment", to: "/m/borescope" },
      { slug: "mechanical", fa: "ارزیابی سلامت مکانیکی", en: "Mechanical Health Assessment", to: "/m/vibration" },
      { slug: "performance", fa: "ارزیابی سلامت عملکردی", en: "Performance Health Assessment", to: E("/performance") },
      { slug: "thermal", fa: "ارزیابی سلامت حرارتی", en: "Thermal Health Assessment", to: E("/performance") },
      { slug: "lubrication", fa: "ارزیابی سیستم روغن‌کاری", en: "Lubrication Health Assessment", to: "/m/oil" },
      { slug: "life", fa: "ارزیابی عمر قطعات", en: "Life Health Assessment", to: "/m/llp" },
      { slug: "trend", fa: "تحلیل روند سلامت", en: "Health Trend Analysis", to: E("/performance") },
      { slug: "comparison", fa: "مقایسه سلامت موتورها", en: "Health Comparison", view: "compare" },
      { slug: "reports", fa: "گزارش ارزیابی سلامت", en: "Health Assessment Reports", to: "/reports" },
    ],
  },
  {
    id: "inspection",
    module: "inspection",
    fa: "بازرسی و یافته‌های فنی",
    en: "Inspection & Findings",
    items: [
      { slug: "planning", fa: "برنامه‌ریزی بازرسی", en: "Inspection Planning", to: E("/plan") },
      { slug: "borescope", fa: "بازرسی بوروسکوپی", en: "Borescope Inspection", to: "/m/borescope" },
      { slug: "visual", fa: "بازرسی چشمی", en: "Visual Inspection", to: E("/faults") },
      { slug: "dimensional", fa: "بازرسی ابعادی", en: "Dimensional Inspection", view: "none", noteFa: "بازرسی ابعادی جداگانه‌ای ذخیره نشده است.", noteEn: "No separate dimensional inspection is stored." },
      { slug: "ndt", fa: "آزمون‌های غیرمخرب", en: "NDT Inspection", view: "none", noteFa: "رکورد NDT جداگانه‌ای ذخیره نشده است.", noteEn: "No separate NDT record is stored." },
      { slug: "vibration", fa: "بررسی ارتعاشات", en: "Vibration Inspection", to: "/m/vibration" },
      { slug: "oil", fa: "تحلیل روغن و ذرات", en: "Oil & Debris Analysis", to: "/m/oil" },
      { slug: "findings", fa: "ثبت یافته‌ها", en: "Inspection Findings", to: E("/faults") },
      { slug: "classification", fa: "طبقه‌بندی عیوب", en: "Defect Classification", view: "defects" },
      { slug: "disposition", fa: "تعیین تکلیف یافته‌ها", en: "Finding Disposition", to: E("/faults") },
      { slug: "history", fa: "تاریخچه بازرسی", en: "Inspection History", view: "records", recordType: "inspection" },
    ],
  },
  {
    id: "maintenance",
    module: "maintenance",
    fa: "مدیریت تعمیرات و نگهداری",
    en: "Maintenance Management",
    items: [
      { slug: "planning", fa: "برنامه‌ریزی تعمیرات", en: "Maintenance Planning", to: E("/plan") },
      { slug: "schedule", fa: "تقویم تعمیرات", en: "Maintenance Schedule", to: E("/plan") },
      { slug: "scheduled", fa: "تعمیرات برنامه‌ریزی‌شده", en: "Scheduled Maintenance", view: "plans" },
      { slug: "unscheduled", fa: "تعمیرات غیر برنامه‌ریزی‌شده", en: "Unscheduled Maintenance", view: "records", recordType: "shop_visit" },
      { slug: "work-orders", fa: "دستورکارهای تعمیراتی", en: "Work Orders", to: "/m/workscope" },
      { slug: "shop", fa: "مدیریت مراجعه به تعمیرگاه", en: "Shop Visit Management", to: E("/maintenance") },
      { slug: "overhaul", fa: "تاریخچه تعمیرات اساسی", en: "Engine Overhaul History", view: "records", recordType: "shop_visit" },
      { slug: "repair", fa: "سوابق تعمیر و تعویض", en: "Repair & Replacement Records", to: "/m/kit" },
      { slug: "compliance", fa: "انطباق با الزامات تعمیراتی", en: "Maintenance Compliance", to: "/m/directive" },
      { slug: "cost", fa: "ردیابی هزینه‌ها", en: "Maintenance Cost Tracking", view: "cost" },
      { slug: "release", fa: "سوابق تأیید و آزادسازی تعمیرات", en: "Maintenance Release Records", view: "records", released: true },
    ],
  },
  {
    id: "predictive",
    module: "predictive",
    fa: "نگهداری و تعمیرات پیش‌بینانه",
    en: "Predictive Maintenance",
    items: [
      { slug: "overview", fa: "نمای کلی پیش‌بینی", en: "Predictive Overview", to: E("/prognostics") },
      { slug: "failure", fa: "پیش‌بینی خرابی", en: "Failure Prediction", to: E("/prognostics") },
      { slug: "anomaly", fa: "تشخیص ناهنجاری", en: "Anomaly Detection", to: "/m/exceedance" },
      { slug: "pattern", fa: "تحلیل الگوهای خرابی", en: "Failure Pattern Analysis", view: "faults", noteFa: "فقط یافته‌های ذخیره‌شده است. الگوی خرابی تازه‌ای ساخته نشده.", noteEn: "Only stored findings are listed. No new failure pattern was generated." },
      { slug: "rul", fa: "تخمین عمر مفید باقی‌مانده", en: "Remaining Useful Life", to: E("/prognostics") },
      { slug: "egt", fa: "پیش‌بینی افت EGT Margin", en: "EGT Deterioration Prediction", to: E("/prognostics") },
      { slug: "risk", fa: "ریسک خرابی قطعات", en: "Component Failure Risk", to: "/m/llp" },
      { slug: "forecast", fa: "پیش‌بینی نیازهای تعمیراتی", en: "Maintenance Forecast", to: E("/plan") },
      { slug: "rbm", fa: "تعمیرات مبتنی بر ریسک", en: "Risk-Based Maintenance", to: E("/plan") },
      { slug: "accuracy", fa: "ارزیابی دقت پیش‌بینی‌ها", en: "Prediction Accuracy", view: "none", noteFa: "امتیاز دقت پیش‌بینی در پایگاه ذخیره نشده است.", noteEn: "No prediction-accuracy score is stored." },
    ],
  },
  {
    id: "documents",
    module: "documents",
    fa: "اسناد فنی",
    en: "Technical Documents",
    items: [
      { slug: "manuals", fa: "کتابچه‌های هواپیما و موتور", en: "Aircraft & Engine Manuals", view: "documents", noteFa: "متن کتابچه سازنده در این پایگاه نیست. سندهای ذخیره‌شده همین شرکت فهرست می‌شود.", noteEn: "OEM manual text is not in this database. The company's stored documents are listed." },
      { slug: "amm", fa: "راهنمای تعمیر و نگهداری هواپیما", en: "AMM", view: "documents", noteFa: "نسخه AMM ذخیره نشده است.", noteEn: "No AMM edition is stored." },
      { slug: "emm", fa: "راهنمای تعمیر و نگهداری موتور", en: "EMM", view: "documents", noteFa: "نسخه EMM ذخیره نشده است.", noteEn: "No EMM edition is stored." },
      { slug: "cmm", fa: "راهنمای تعمیر قطعات", en: "CMM", view: "documents", noteFa: "نسخه CMM ذخیره نشده است.", noteEn: "No CMM edition is stored." },
      { slug: "overhaul-manual", fa: "راهنمای تعمیر اساسی", en: "Engine Overhaul Manual", view: "documents", noteFa: "راهنمای تعمیر اساسی ذخیره نشده است.", noteEn: "No overhaul manual is stored." },
      { slug: "ipc", fa: "کاتالوگ قطعات", en: "Illustrated Parts Catalog", to: E("/configuration") },
      { slug: "sb", fa: "بولتن‌های خدماتی", en: "Service Bulletins", to: "/m/directive" },
      { slug: "ad", fa: "دستورالعمل‌های صلاحیت پروازی", en: "Airworthiness Directives", to: "/m/directive" },
      { slug: "drawings", fa: "نقشه‌های فنی", en: "Technical Drawings", view: "documents", noteFa: "نقشه فنی جداگانه‌ای ذخیره نشده است.", noteEn: "No separate technical drawing is stored." },
      { slug: "test-reports", fa: "گزارش‌های تست", en: "Test Reports", to: "/m/testcell" },
      { slug: "revision", fa: "کنترل ویرایش اسناد", en: "Document Revision Control", to: "/documents" },
    ],
  },
  {
    id: "intelligence",
    module: "intelligence",
    fa: "هوشمندسازی اسناد",
    en: "Document Intelligence",
    items: [
      { slug: "search", fa: "جست‌وجوی هوشمند اسناد", en: "Intelligent Document Search", to: "/documents" },
      { slug: "ocr", fa: "استخراج اطلاعات از اسناد", en: "OCR & Data Extraction", view: "fields", noteFa: "استخراج تازه‌ای اجرا نمی‌شود. فقط فیلدهایی که از قبل ذخیره شده‌اند، با شماره صفحه، نشان داده می‌شود. این خروجی مبنای تصمیم فنی نیست.", noteEn: "No new extraction is run. Only fields already stored are shown, with their page number. This output is not a technical decision." },
      { slug: "analysis", fa: "تحلیل محتوای فنی", en: "Technical Document Analysis", view: "documents" },
      { slug: "classification", fa: "طبقه‌بندی خودکار", en: "Automated Data Classification", view: "documents", noteFa: "طبقه‌بندی خودکار تازه‌ای ساخته نشده. رده ذخیره‌شده هر سند نشان داده می‌شود.", noteEn: "No new automatic classification is built. Each document's stored class is shown." },
      { slug: "specification", fa: "استخراج مشخصات فنی", en: "Specification Extraction", view: "fields" },
      { slug: "maintenance-records", fa: "تحلیل سوابق تعمیراتی", en: "Maintenance Record Analysis", view: "records" },
      { slug: "applicability", fa: "تحلیل قابلیت اعمال SB و AD", en: "SB / AD Applicability Analysis", to: "/m/directive" },
      { slug: "comparison", fa: "مقایسه نسخه‌های اسناد", en: "Document Comparison", view: "documents", noteFa: "مقایسه متن دو نسخه ساخته نمی‌شود. عنوان و تاریخ سندهای ذخیره‌شده کنار هم است.", noteEn: "No text diff is built. Stored document titles and dates are listed together." },
      { slug: "assistant", fa: "دستیار هوشمند فنی", en: "AI Technical Assistant", view: "none", noteFa: "دستیار جداگانه‌ای به این صفحه وصل نیست. نتیجه ماشینی بدون تأیید متخصص مبنای تصمیم فنی نیست.", noteEn: "No assistant is connected to this page. A machine result is not a technical decision without a specialist." },
    ],
  },
  {
    id: "reliability",
    module: "predictive",
    fa: "قابلیت اطمینان و مدیریت ریسک",
    en: "Reliability & Risk",
    items: [
      { slug: "overview", fa: "نمای کلی قابلیت اطمینان ناوگان", en: "Fleet Reliability Overview", view: "counts" },
      { slug: "failure-rate", fa: "تحلیل نرخ خرابی", en: "Failure Rate Analysis", view: "counts", noteFa: "نرخ خرابی محاسبه نشده است. فقط شمار یافته‌ها و ساعت ذخیره‌شده است.", noteEn: "A failure rate is not calculated. Only the stored finding count and hours are shown." },
      { slug: "mtbf", fa: "تحلیل میانگین زمان بین خرابی‌ها", en: "MTBF Analysis", view: "counts", noteFa: "MTBF محاسبه نشده است.", noteEn: "MTBF is not calculated." },
      { slug: "mtbur", fa: "تحلیل میانگین زمان بین جداسازی‌های برنامه‌ریزی‌نشده", en: "MTBUR Analysis", view: "removals", noteFa: "MTBUR محاسبه نشده است. جداسازی‌های ذخیره‌شده فهرست شده‌اند.", noteEn: "MTBUR is not calculated. Stored removals are listed." },
      { slug: "unscheduled", fa: "تحلیل جداسازی‌های غیر برنامه‌ریزی‌شده", en: "Unscheduled Removal Analysis", view: "removals" },
      { slug: "repetitive", fa: "تحلیل عیوب تکرارشونده", en: "Repetitive Defect Analysis", view: "defects" },
      { slug: "modes", fa: "تحلیل حالات خرابی", en: "Failure Mode Analysis", view: "faults" },
      { slug: "fmea", fa: "تحلیل حالات و آثار خرابی", en: "FMEA / FMECA", view: "none", noteFa: "جدول FMEA یا FMECA در این پایگاه نیست.", noteEn: "No FMEA or FMECA table is stored." },
      { slug: "risk", fa: "ارزیابی ریسک", en: "Risk Assessment", to: E("/plan") },
      { slug: "reports", fa: "گزارش‌های قابلیت اطمینان", en: "Reliability Reports", to: "/reports" },
    ],
  },
  {
    id: "data",
    module: "dashboard",
    fa: "مدیریت داده‌ها",
    en: "Data Management",
    items: [
      { slug: "acquisition", fa: "دریافت داده‌ها", en: "Data Acquisition", view: "counts" },
      { slug: "import", fa: "ورود اطلاعات", en: "Data Import", to: "/documents" },
      { slug: "export", fa: "خروجی اطلاعات", en: "Data Export", to: "/reports" },
      { slug: "flight", fa: "اتصال به داده‌های پروازی", en: "Flight Data Integration", view: "samples", noteFa: "اتصال به سامانه پروازی ذخیره نشده است.", noteEn: "No flight-system connection is stored." },
      { slug: "sensors", fa: "مدیریت داده سنسورها", en: "Sensor Data Management", to: "/m/sensors" },
      { slug: "validation", fa: "اعتبارسنجی اطلاعات", en: "Data Validation", view: "gaps" },
      { slug: "cleaning", fa: "پاک‌سازی داده‌ها", en: "Data Cleaning", view: "gaps" },
      { slug: "quality", fa: "پایش کیفیت داده‌ها", en: "Data Quality Monitoring", view: "gaps" },
      { slug: "mapping", fa: "نگاشت پارامترها", en: "Data Mapping", view: "parameters" },
      { slug: "api", fa: "ارتباط با سامانه‌های خارجی", en: "API Integration", view: "none", noteFa: "اتصال به سامانه خارجی ذخیره نشده است.", noteEn: "No external-system connection is stored." },
      { slug: "backup", fa: "پشتیبان‌گیری و بازیابی", en: "Backup & Recovery", view: "none", noteFa: "پشتیبان‌گیری از این صفحه در دسترس نیست. هر شرکت فقط داده‌های خودش را می‌بیند.", noteEn: "Backup is not available from this page. Each company sees only its own data." },
    ],
  },
  {
    id: "admin",
    module: "admin",
    fa: "مدیریت سیستم و امنیت",
    en: "Administration & Security",
    items: [
      { slug: "users", fa: "مدیریت کاربران", en: "User Management", to: "/admin/users" },
      { slug: "roles", fa: "مدیریت نقش‌ها", en: "Role Management", view: "users" },
      { slug: "permissions", fa: "مدیریت دسترسی‌ها", en: "Permission Management", view: "users" },
      { slug: "access", fa: "کنترل دسترسی سازمانی", en: "Organization Access Control", view: "org" },
      { slug: "audit", fa: "ثبت سوابق فعالیت کاربران", en: "Audit Trail", to: "/audit" },
      { slug: "configuration", fa: "تنظیمات سیستم", en: "System Configuration", view: "none", noteFa: "تنظیم جداگانه‌ای جز زبان و روشنایی نشست ذخیره نشده است.", noteEn: "No setting is stored beyond the session language and theme." },
      { slug: "notifications", fa: "تنظیمات اعلان‌ها", en: "Notification Settings", to: "/m/alert" },
      { slug: "workflow", fa: "مدیریت گردش کار", en: "Workflow Management", view: "none", noteFa: "گردش کار جداگانه‌ای ذخیره نشده است.", noteEn: "No separate workflow is stored." },
      { slug: "reference", fa: "مدیریت داده‌های پایه", en: "Reference Data Management", to: "/knowledge" },
      { slug: "database", fa: "مدیریت پایگاه داده", en: "Database Management", view: "counts" },
      { slug: "security", fa: "پایش امنیت", en: "Security Monitoring", to: "/audit" },
      { slug: "logs", fa: "گزارش‌های سیستم", en: "System Logs", to: "/audit" },
    ],
  },
];

export function menuHref(item: MenuLeaf, group: MenuGroup, engineId: string) {
  if (!item.to) return `/s/${group.id}/${item.slug}`;
  if (item.to.startsWith(":engine")) {
    const rest = item.to.slice(":engine".length);
    return engineId ? `/engines/${engineId}${rest}` : "/fleet";
  }
  return item.to;
}

export function findLeaf(groupId: string, slug: string) {
  const group = MENU.find((item) => item.id === groupId);
  const leaf = group?.items.find((item) => item.slug === slug);
  if (!group || !leaf) return null;
  return { group, leaf };
}
