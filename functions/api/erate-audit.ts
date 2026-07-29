interface Env {
  AIRTABLE_PAT: string;
}

const BASE_ID = "appOTTtOW0BObFOUj";
const TABLE_ID = "tblAKhwKBI3r5mVYh";
const C2_PER_STUDENT = 201.57;
const C2_FLOOR = 30175;

// (min_nslp, max_nslp, urban_cat1, rural_cat1, cat2_cap)
const DISCOUNT_MATRIX: [number, number, number, number, number | null][] = [
  [0.0, 0.009999, 0.20, 0.25, null],
  [0.01, 0.1999, 0.40, 0.50, null],
  [0.20, 0.3499, 0.50, 0.60, null],
  [0.35, 0.4999, 0.60, 0.70, null],
  [0.50, 0.7499, 0.80, 0.80, null],
  [0.75, 1.00, 0.90, 0.90, 0.85],
];

const ALLOWED_FIELDS = [
  "Entity Name",
  "City",
  "State",
  "Urban Rural",
  "Enrollment",
  "Free Lunch Pct",
  "ERate Discount Pct",
  "Current ISP",
  "Form 470 Active",
  "Form 470 Categories",
  "Contract Expiry",
  "Charter",
  "ERate Total 5yr",
  "ERate Cat1 5yr",
  "ERate Cat2 5yr",
];

type SchoolRecord = Record<string, unknown>;

interface Flag {
  label: string;
  status: "ok" | "warn" | "unknown";
  detail: string;
}

function sanitizeForFormula(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function lookupSchool(
  schoolName: string,
  pat: string
): Promise<SchoolRecord | null> {
  const words = schoolName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => sanitizeForFormula(w));

  const formula =
    words.length === 1
      ? `SEARCH(LOWER("${words[0]}"), LOWER({Entity Name}))`
      : `AND(${words.map((w) => `SEARCH(LOWER("${w}"), LOWER({Entity Name}))`).join(",")})`;

  const params = new URLSearchParams();
  params.set("filterByFormula", formula);
  params.set("maxRecords", "1");
  for (const field of ALLOWED_FIELDS) {
    params.append("fields[]", field);
  }

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${pat}` },
  });

  if (!res.ok) throw new Error(`Airtable ${res.status}`);

  const data = (await res.json()) as { records?: { fields: SchoolRecord }[] };
  if (!data.records?.length) return null;
  return data.records[0].fields;
}

function computeDiscount(
  nslpPct: number,
  urbanRural: string
): { cat1: number; cat2: number } {
  const rural = ["rural", "town"].includes(
    (urbanRural || "").trim().toLowerCase()
  );
  for (const [lo, hi, urb, rur, cat2Cap] of DISCOUNT_MATRIX) {
    if (nslpPct >= lo && nslpPct <= hi) {
      const cat1 = rural ? rur : urb;
      const cat2 = cat2Cap !== null ? cat2Cap : cat1;
      return { cat1, cat2 };
    }
  }
  return { cat1: 0, cat2: 0 };
}

function computeC2Budget(enrollment: number): {
  budget: number;
  usesFloor: boolean;
} {
  const calc = enrollment * C2_PER_STUDENT;
  if (calc < C2_FLOOR) return { budget: C2_FLOOR, usesFloor: true };
  return { budget: Math.round(calc), usesFloor: false };
}

function buildFlags(school: SchoolRecord): Flag[] {
  const active470 = school["Form 470 Active"] as boolean | undefined;
  const cat2Spent = ((school["ERate Cat2 5yr"] as number) || 0);
  const cat1Spent = ((school["ERate Cat1 5yr"] as number) || 0);
  const discount = ((school["ERate Discount Pct"] as number) || 0);

  return [
    {
      label: "Active Form 470 on file for the current year",
      status: active470 ? "ok" : "warn",
      detail: active470
        ? "A current Form 470 is posted, which is the gate that lets you file for funding."
        : "No current Form 470 on file. Without it, you can't claim E-Rate this cycle — this is the single biggest gap.",
    },
    {
      label: "Category 1 (internet) filed and competitively bid",
      status: cat1Spent > 0 ? "ok" : "warn",
      detail:
        cat1Spent > 0
          ? `Category 1 filings visible in USAC records ($${cat1Spent.toLocaleString("en-US")} 5-year). A separate check is needed to confirm the rate is competitive.`
          : "No Category 1 filings visible. Internet/data transmission is the easiest category to file — leaving it unfiled means paying full price on your ISP bill.",
    },
    {
      label: "Category 2 budget being used (not forfeited)",
      status: cat2Spent > 0 ? "ok" : "warn",
      detail:
        cat2Spent > 0
          ? `Cat 2 funding of $${cat2Spent.toLocaleString("en-US")} visible in the prior cycle. The FY2026-2030 cycle is a fresh budget — reset, not rolled over.`
          : "No Category 2 funding drawn in the prior cycle. That money does not roll over. The new FY2026-2030 budget is fresh — don't forfeit it twice.",
    },
    {
      label: "Discount rate reflects current NSLP data",
      status: discount >= 0.5 ? "ok" : "warn",
      detail:
        discount >= 0.5
          ? `Your ${Math.round(discount * 100)}% discount is in the expected band for your free/reduced lunch rate. Verify NSLP data in EPC is the most recent year.`
          : `Your ${Math.round(discount * 100)}% discount looks low for a charter school. A stale or missing NSLP filing can drag this down. Direct certification data often boosts the rate significantly.`,
    },
    {
      label: "CEP eligibility optimized (if applicable)",
      status: "unknown",
      detail:
        "If 40% or more of your students are directly certified (Medicaid, SNAP, TANF), CEP enrollment with the 1.6 multiplier can push your discount rate into the 85-90% band. This is the single biggest lever on the discount side and is often overlooked.",
    },
  ];
}

function estimateAnnualExposure(
  school: SchoolRecord,
  c2Budget: number,
  discountC2: number
): number {
  let exposure = 0;
  const enrollment = ((school["Enrollment"] as number) || 0);
  const discountC1 = ((school["ERate Discount Pct"] as number) || 0);

  if (!(((school["ERate Cat1 5yr"] as number) || 0) > 0)) {
    const estAnnualC1 = Math.max(enrollment * 30, 6000);
    exposure += estAnnualC1 * discountC1;
  }

  if (!(((school["ERate Cat2 5yr"] as number) || 0) > 0)) {
    exposure += (c2Budget * discountC2) / 5;
  }

  return Math.round(exposure / 100) * 100;
}

function buildBottomLine(school: SchoolRecord, exposure: number): string {
  const cat1 = ((school["ERate Cat1 5yr"] as number) || 0);
  const cat2 = ((school["ERate Cat2 5yr"] as number) || 0);
  const hasAnyFiling = cat1 > 0 || cat2 > 0;

  if (!hasAnyFiling) {
    return (
      "No recent E-Rate activity visible. For a school your size, starting the filing " +
      "process for FY2027 (window opens July 2026) could recover meaningful federal funding " +
      "on both your internet service and network infrastructure."
    );
  }
  if (exposure > 5000) {
    return (
      "Partial filing history. The largest gap is the Category 2 5-year budget, which " +
      "resets with FY2026 and doesn't roll over. A 30-minute walk-through will identify " +
      "exactly what to file for the FY2027 cycle to capture what's available."
    );
  }
  return (
    "Filing activity looks reasonable. A focused review can verify that your discount rate " +
    "is current, your Cat 1 rate is competitive, and your remaining Cat 2 budget is on track " +
    "to be used before the cycle closes in 2030."
  );
}

function fmtCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function renderAudit(school: SchoolRecord) {
  const enrollment = ((school["Enrollment"] as number) || 0);
  const nslpPct = ((school["Free Lunch Pct"] as number) || 0);
  const urbanRural = ((school["Urban Rural"] as string) || "Urban");
  const discountC1 = ((school["ERate Discount Pct"] as number) || 0);

  let { cat2: discountC2 } = computeDiscount(nslpPct, urbanRural);
  if (discountC2 === 0 && discountC1 > 0) {
    discountC2 = Math.min(discountC1, 0.85);
  }

  const { budget: c2Budget, usesFloor: c2UsesFloor } =
    computeC2Budget(enrollment);
  const c2Federal = c2Budget * discountC2;
  const c2School = c2Budget - c2Federal;

  const flags = buildFlags(school);
  const exposure = estimateAnnualExposure(school, c2Budget, discountC2);
  const bottomLineText = buildBottomLine(school, exposure);

  return {
    schoolName: school["Entity Name"] || "School",
    city: school["City"] || "",
    state: school["State"] || "MN",
    urbanRural,
    enrollment,
    enrollmentFmt: enrollment.toLocaleString("en-US"),
    nslpPct: fmtPct(nslpPct),
    currentIsp: (school["Current ISP"] as string) || null,
    form470Active: !!(school["Form 470 Active"]),
    discountPct: fmtPct(discountC1),
    discountC2Pct: fmtPct(discountC2),
    c2UsesFloor,
    c2Budget: fmtCurrency(c2Budget),
    c2Federal: fmtCurrency(c2Federal),
    c2School: fmtCurrency(c2School),
    c2Formula: c2UsesFloor
      ? "Small-school floor ($30,175)"
      : `${enrollment.toLocaleString("en-US")} students × $201.57 per student`,
    flags,
    annualExposure: fmtCurrency(exposure),
    bottomLineText,
  };
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AIRTABLE_PAT) {
    return jsonResponse(
      { error: "server_error", message: "Something went wrong." },
      500
    );
  }

  let body: { school?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { error: "bad_request", message: "Invalid request." },
      400
    );
  }

  const schoolName = body?.school?.trim();
  if (!schoolName || schoolName.length < 2 || schoolName.length > 200) {
    return jsonResponse(
      { error: "bad_request", message: "School name required." },
      400
    );
  }

  try {
    const school = await lookupSchool(schoolName, env.AIRTABLE_PAT);
    if (!school) {
      return jsonResponse(
        {
          error: "school_not_found",
          message: "No school matching that name was found.",
        },
        404
      );
    }
    return jsonResponse(renderAudit(school), 200);
  } catch {
    return jsonResponse(
      { error: "server_error", message: "Something went wrong." },
      500
    );
  }
};
