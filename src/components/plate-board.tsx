"use client";

import { useState } from "react";
import { L, type Locale } from "@/lib/i18n";
import { platesFor, type TrainingPlate } from "@/lib/plates";

const STATIONS: { id: string; fa: string; en: string; x: number; y: number }[] = [
  { id: "0", fa: "جریان آزاد محیط", en: "Free-stream ambient", x: 28, y: 36 },
  { id: "2", fa: "ورودی فن، تویی", en: "Fan inlet hub", x: 90, y: 36 },
  { id: "12", fa: "ورودی فن، نوک. T12", en: "Fan inlet tip. T12", x: 150, y: 36 },
  { id: "13", fa: "خروجی OGV فن", en: "Fan OGV discharge", x: 230, y: 36 },
  { id: "15", fa: "خروجی قاب فن", en: "Fan frame discharge", x: 330, y: 36 },
  { id: "18", fa: "گلوگاه نازل کنارگذر", en: "Bypass nozzle throat", x: 860, y: 36 },
  { id: "23", fa: "خروجی booster", en: "Booster discharge", x: 250, y: 88 },
  { id: "24", fa: "تخلیه VBV", en: "VBV discharge", x: 310, y: 88 },
  { id: "25", fa: "ورودی HPC. T25", en: "HPC inlet. T25", x: 370, y: 88 },
  { id: "27", fa: "bleed طبقه ۵", en: "Stage-5 bleed", x: 430, y: 88 },
  { id: "3", fa: "خروجی HPC. T3 و PS3", en: "HPC discharge. T3 and PS3", x: 490, y: 88 },
  { id: "4", fa: "خروجی محفظه", en: "Combustor discharge", x: 545, y: 88 },
  { id: "41", fa: "ورود روتور HPT", en: "HPT rotor inlet", x: 600, y: 88 },
  { id: "42", fa: "خروج HPT", en: "HPT discharge", x: 650, y: 88 },
  { id: "48", fa: "ورود LPT", en: "LPT inlet", x: 700, y: 88 },
  { id: "49", fa: "ورود روتور LPT", en: "LPT rotor inlet", x: 748, y: 88 },
  { id: "495", fa: "صفحه EGT، T49.5", en: "EGT plane, T49.5", x: 800, y: 88 },
  { id: "5", fa: "خروجی LPT", en: "LPT discharge", x: 848, y: 88 },
  { id: "55", fa: "خروج قاب LPT", en: "LPT frame exit", x: 888, y: 88 },
  { id: "8", fa: "گلوگاه نازل اولیه", en: "Primary nozzle throat", x: 848, y: 128 },
  { id: "9", fa: "خروج نازل اولیه", en: "Primary nozzle discharge", x: 910, y: 128 },
];

const FUEL_STEPS: { id: string; fa: string; en: string }[] = [
  { id: "FROM A/C", fa: "سوخت از مخزن هواپیما وارد پمپ می‌شود.", en: "Fuel leaves the aircraft tanks and enters the pump." },
  { id: "LP", fa: "مرحله boost فشار را برای عبور از مبدل‌ها بالا می‌برد.", en: "The boost stage raises pressure enough to cross the coolers." },
  { id: "IDG cooler", fa: "سوخت، روغن IDG را خنک می‌کند.", en: "Fuel cools the IDG oil." },
  { id: "Oil/fuel HX", fa: "سوخت، روغن scavenge موتور را خنک می‌کند.", en: "Fuel cools engine scavenge oil." },
  { id: "Filter", fa: "فیلتر اصلی، پیش از مرحله فشار بالا.", en: "Main filter, ahead of the high-pressure stage." },
  { id: "HP", fa: "مرحله دنده فشار metering و سروو را می‌سازد.", en: "The gear stage makes metering pressure and servo pressure." },
  { id: "HMU meter", fa: "HMU مقدار سوخت احتراق را اندازه می‌گیرد.", en: "The HMU meters the combustion fuel." },
  { id: "FF transmitter", fa: "فرستنده، دبی وزنی را به EEC می‌دهد.", en: "The transmitter reports weight flow to the EEC." },
  { id: "Nozzle filter", fa: "آخرین فیلتر، با مسیر bypass اگر گرفته شود.", en: "Last filter, with a bypass if it clogs." },
  { id: "20 nozzles", fa: "بیست نازل. در DAC سر pilot و سر main جدا هستند.", en: "Twenty nozzles. On a DAC the pilot tip and the main tip are separate." },
  { id: "Servo heater", fa: "شاخه دوم HP، سوخت سروو را گرم می‌کند.", en: "The second HP branch warms servo fuel." },
  { id: "Actuators", fa: "VBV، VSV، HPTACC، LPTACC و TBV از همین فشار حرکت می‌کنند.", en: "VBV, VSV, HPTACC, LPTACC, and TBV move on this pressure." },
];

const INDICATION = [
  { id: "N1", fa: "دور سیستم فشار پایین، پارامتر تنظیم رانش.", en: "Low-pressure system speed, the thrust-setting parameter." },
  { id: "N2", fa: "دور سیستم فشار بالا.", en: "High-pressure system speed." },
  { id: "EGT", fa: "دمای گاز در صفحه T49.5.", en: "Gas temperature at the T49.5 plane." },
  { id: "FF", fa: "دبی سوخت به نازل‌ها.", en: "Fuel flow to the nozzles." },
  { id: "OIL P", fa: "فشار روغن تغذیه.", en: "Supply oil pressure." },
  { id: "OIL T", fa: "دمای روغن.", en: "Oil temperature." },
  { id: "OIL Q", fa: "مقدار روغن مخزن.", en: "Tank oil quantity." },
  { id: "VIB", fa: "ارتعاش یاتاقان ۱ و FFCCV.", en: "No. 1 bearing and FFCCV vibration." },
  { id: "FUEL", fa: "سوخت باقی‌مانده و سوخت مصرف‌شده.", en: "Fuel remaining and fuel used." },
  { id: "TAT", fa: "دمای کل هوای محیط.", en: "Ambient total air temperature." },
  { id: "REV", fa: "وضعیت قفل thrust reverser.", en: "Thrust-reverser lock state." },
  { id: "TAI", fa: "نشان ضد یخ حرارتی.", en: "Thermal anti-ice indication." },
  { id: "FUEL USED", fa: "سوخت مصرف‌شده، جدا از مقدار باقی‌مانده.", en: "Fuel used, separate from quantity remaining." },
  { id: "HYD", fa: "فشار و مقدار هیدرولیک بدنه.", en: "Airframe hydraulic pressure and quantity." },
  { id: "A/T LIM", fa: "پیام حد autothrottle.", en: "Autothrottle limit message." },
  { id: "MODE", fa: "حالت رانش و پیام هشدار خدمه.", en: "Thrust mode and crew alert messages." },
];

const OIL_CIRCUITS: { id: string; fa: string; en: string }[] = [
  { id: "Supply", fa: "از مخزن، از شیر ضدنشت، به پمپ تغذیه و فیلتر، بعد به sump جلو، sump عقب، و AGB/TGB.", en: "From the tank, through the anti-leakage valve, the supply pump and filter, then to the forward sump, the aft sump, and the AGB/TGB." },
  { id: "Scavenge", fa: "سه برگشت: جلو، AGB/TGB، و عقب. سه پمپ، بعد فیلتر scavenge و مبدل روغن/سوخت، و بازگشت به مخزن.", en: "Three returns: forward, AGB/TGB, and aft. Three pumps, then the scavenge filter and the oil/fuel exchangers, and back to the tank." },
  { id: "Vent", fa: "مخلوط هوا و روغن از sumpها و لوله تهویه مرکزی، خروج از exhaust plug.", en: "Air and oil mixture from the sumps and the center vent tube, leaving through the exhaust plug." },
];

const CDU_MENUS: { id: string; fa: string; en: string }[] = [
  { id: "Recent faults", fa: "عیب‌های legهای ۰ تا ۳.", en: "Faults from legs 0 to 3." },
  { id: "Fault history", fa: "تاریخچه legهای ۰ تا ۱۰.", en: "History from legs 0 to 10." },
  { id: "Ident/config", fa: "شناسه و پیکربندی داخل EEC.", en: "Identity and configuration stored in the EEC." },
  { id: "Ground tests", fa: "آزمون EEC، قفل اهرم T/R، عملگرها، igniter چپ و راست. این فهرست مطالعه است.", en: "EEC test, T/R lever interlock, actuators, left and right igniters. This list is for study." },
  { id: "Input monitoring", fa: "ورودی‌های زنده، از جمله صفحه روغن و یادداشت DMS.", en: "Live inputs, including the oil page and the DMS note." },
];

function Plate({ plate, locale }: { plate: TrainingPlate; locale: Locale }) {
  const [open, setOpen] = useState(plate.callouts[0]?.label ?? "");
  const current = plate.callouts.find((item) => item.label === open) ?? plate.callouts[0];
  return (
    <article className="panel study-plate" id={`plate-${plate.id}`}>
      <p className="kicker">{plate.ctc}</p>
      <h2>{locale === "fa" ? plate.titleFa : plate.titleEn}</h2>
      <p>{locale === "fa" ? plate.blurbFa : plate.blurbEn}</p>
      {plate.file ? <img src={plate.file} alt={plate.ctc} /> : null}
      <p className="note">{plate.ctc} · {L(locale, "زیرنویس آموزشی. این تصویر جایگزین دستورالعمل نگهداری نیست.", "Training caption. This image is not a maintenance instruction.")}</p>
      <div className="plate-calls">
        {plate.callouts.map((item) => (
          <button key={item.label} type="button" className={item.label === current?.label ? "btn" : "btn ghost"} onClick={() => setOpen(item.label)}>
            {item.label}
          </button>
        ))}
      </div>
      {current ? <p><b>{current.label}.</b> {locale === "fa" ? current.fa : current.en}</p> : null}
    </article>
  );
}

function Airflow({ locale }: { locale: Locale }) {
  const [zone, setZone] = useState("secondary");
  const copy: Record<string, { fa: string; en: string }> = {
    secondary: { fa: "جریان ثانویه دور هسته می‌رود و بخش بزرگ رانش را می‌سازد.", en: "Secondary flow goes around the core and makes most of the thrust." },
    primary: { fa: "جریان اولیه از booster و HPC و احتراق و توربین‌ها می‌گذرد.", en: "Primary flow goes through the booster, HPC, combustion, and the turbines." },
    reverser: { fa: "در برگشت رانش، blocker و cascade جریان ثانویه را به جلو برمی‌گردانند.", en: "In reverse, the blocker and cascade turn the secondary stream forward." },
  };
  return (
    <section className="panel">
      <h2>{L(locale, "مسیر هوا", "Air path")}</h2>
      <svg className="flow-svg" viewBox="0 0 640 180" role="img" aria-label="primary and secondary flow">
        <rect x="8" y="18" width="620" height="70" rx="28" fill="#123047" onClick={() => setZone("secondary")} />
        <text x="320" y="58" textAnchor="middle" fill="#d7ecf6" fontSize="16">SECONDARY FLOW</text>
        <rect x="70" y="100" width="420" height="58" rx="18" fill="#3a2748" onClick={() => setZone("primary")} />
        <text x="280" y="134" textAnchor="middle" fill="#f3e7f8" fontSize="16">PRIMARY FLOW</text>
        <rect x="470" y="108" width="140" height="44" rx="10" fill="#8a5a18" onClick={() => setZone("reverser")} />
        <text x="540" y="135" textAnchor="middle" fill="#fff6e8" fontSize="13">REVERSER</text>
      </svg>
      <p>{locale === "fa" ? copy[zone].fa : copy[zone].en}</p>
    </section>
  );
}

function FuelFlow({ locale }: { locale: Locale }) {
  const [step, setStep] = useState(FUEL_STEPS[0].id);
  const current = FUEL_STEPS.find((item) => item.id === step) ?? FUEL_STEPS[0];
  return (
    <section className="panel">
      <h2>{L(locale, "مسیر سوخت", "Fuel path")}</h2>
      <div className="plate-calls">
        {FUEL_STEPS.map((item) => (
          <button key={item.id} type="button" className={item.id === current.id ? "btn" : "btn ghost"} onClick={() => setStep(item.id)}>
            {item.id}
          </button>
        ))}
      </div>
      <p><b>{current.id}.</b> {locale === "fa" ? current.fa : current.en}</p>
    </section>
  );
}

function StationMap({ locale }: { locale: Locale }) {
  const [id, setId] = useState("25");
  const current = STATIONS.find((item) => item.id === id) ?? STATIONS[0];
  return (
    <section className="panel">
      <h2>{L(locale, "ایستگاه‌های آیروترمودینامیک", "Aero-thermodynamic stations")}</h2>
      <svg className="flow-svg" viewBox="0 0 940 150" role="img" aria-label="station map">
        <path d="M20 78 C 160 78, 220 40, 360 40 L 860 40" fill="none" stroke="#2f6f86" strokeWidth="18" />
        <path d="M20 78 C 180 78, 250 92, 900 92" fill="none" stroke="#6b4a78" strokeWidth="10" />
        {STATIONS.map((item) => (
          <g key={item.id} onClick={() => setId(item.id)} style={{ cursor: "pointer" }}>
            <circle cx={item.x} cy={item.y} r={item.id === id ? 12 : 8} fill={item.id === id ? "#e0a24a" : "#d7ecf6"} />
            <text x={item.x} y={item.y - 14} textAnchor="middle" fill="#d7ecf6" fontSize="11">{item.id}</text>
          </g>
        ))}
      </svg>
      <p><b>{current.id}.</b> {locale === "fa" ? current.fa : current.en}</p>
    </section>
  );
}

function OilCircuits({ locale }: { locale: Locale }) {
  const [id, setId] = useState(OIL_CIRCUITS[0].id);
  const current = OIL_CIRCUITS.find((item) => item.id === id) ?? OIL_CIRCUITS[0];
  return (
    <section className="panel">
      <h2>{L(locale, "سه مدار روغن", "Three oil circuits")}</h2>
      <div className="plate-calls">
        {OIL_CIRCUITS.map((item) => (
          <button key={item.id} type="button" className={item.id === current.id ? "btn" : "btn ghost"} onClick={() => setId(item.id)}>
            {item.id}
          </button>
        ))}
      </div>
      <p><b>{current.id}.</b> {locale === "fa" ? current.fa : current.en}</p>
    </section>
  );
}

function CduMap({ locale }: { locale: Locale }) {
  const [id, setId] = useState(CDU_MENUS[0].id);
  const current = CDU_MENUS.find((item) => item.id === id) ?? CDU_MENUS[0];
  return (
    <section className="panel">
      <h2>{L(locale, "منوی نگهداری زمینی", "Ground-maintenance menu")}</h2>
      <p>{L(locale, "مسیر مطالعه: MAINT BITE INDEX، بعد ENGINE، بعد ENGINE/EXCEED BITE INDEX. گفتگو روی ARINC-429 است.", "Study path: MAINT BITE INDEX, then ENGINE, then the ENGINE/EXCEED BITE INDEX. The conversation rides ARINC-429.")}</p>
      <div className="plate-calls">
        {CDU_MENUS.map((item) => (
          <button key={item.id} type="button" className={item.id === current.id ? "btn" : "btn ghost"} onClick={() => setId(item.id)}>
            {item.id}
          </button>
        ))}
      </div>
      <p><b>{current.id}.</b> {locale === "fa" ? current.fa : current.en}</p>
    </section>
  );
}

function IndicationKey({ locale }: { locale: Locale }) {
  const [id, setId] = useState("N1");
  const current = INDICATION.find((item) => item.id === id) ?? INDICATION[0];
  return (
    <section className="panel">
      <h2>{L(locale, "کلید پارامترهای نمایش", "Indication key")}</h2>
      <div className="plate-calls">
        {INDICATION.map((item) => (
          <button key={item.id} type="button" className={item.id === current.id ? "btn" : "btn ghost"} onClick={() => setId(item.id)}>
            {item.id}
          </button>
        ))}
      </div>
      <p><b>{current.id}.</b> {locale === "fa" ? current.fa : current.en}</p>
    </section>
  );
}

export function PlateBoard({ locale, topics }: { locale: Locale; topics: string[] }) {
  const plates = platesFor(topics);
  return (
    <div className="stack">
      {topics.includes("flow") ? <Airflow locale={locale} /> : null}
      {topics.includes("fuel") ? <FuelFlow locale={locale} /> : null}
      {topics.includes("sensors") ? <StationMap locale={locale} /> : null}
      {topics.includes("indication") ? <IndicationKey locale={locale} /> : null}
      {topics.includes("indication") ? <CduMap locale={locale} /> : null}
      {topics.includes("oil") ? <OilCircuits locale={locale} /> : null}
      {plates.map((plate) => (
        <Plate key={plate.id} plate={plate} locale={locale} />
      ))}
    </div>
  );
}
