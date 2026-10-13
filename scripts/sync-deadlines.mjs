// Fetches Blu's Canvas calendar feed and upserts deadlines into Supabase.
// Runs weekly via .github/workflows/sync-deadlines.yml (and on demand via workflow_dispatch).
// Only rows whose id starts with "canvas:" are touched here, so edits made by hand
// in the app (source becomes "manual") are never overwritten by this sync.

const ICS_URL = process.env.CANVAS_ICS_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!ICS_URL || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing CANVAS_ICS_URL, SUPABASE_URL, or SUPABASE_ANON_KEY env vars.");
  process.exit(1);
}

const WINDOW_PAST_DAYS = 14;
const WINDOW_FUTURE_DAYS = 240;

function unfoldLines(text) {
  // RFC 5545: a line that starts with a space or tab is a continuation of the previous line.
  const raw = text.split(/\r\n|\n|\r/);
  const out = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeIcsText(s) {
  return (s || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value) {
  // Handles YYYYMMDD and YYYYMMDDTHHMMSS[Z]
  const m = /^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2}))?/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}`;
}

function parseEvents(icsText) {
  const lines = unfoldLines(icsText);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    let key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    key = key.split(";")[0]; // drop parameters like ;VALUE=DATE
    if (key === "UID") cur.uid = value.trim();
    else if (key === "SUMMARY") cur.summary = unescapeIcsText(value);
    else if (key === "DESCRIPTION") cur.description = unescapeIcsText(value);
    else if (key === "DTSTART") cur.dtstart = value.trim();
    else if (key === "DTEND") cur.dtend = value.trim();
  }
  return events;
}

function extractClass(summary) {
  // Canvas calendar feed titles are usually "Assignment Title [COURSE CODE]".
  const m = /\[([^\]]+)\]\s*$/.exec(summary || "");
  if (m) return m[1].trim();
  return "Canvas";
}

function cleanTitle(summary) {
  return (summary || "").replace(/\s*\[[^\]]+\]\s*$/, "").trim() || "Canvas event";
}

function looksLikeExam(title) {
  return /\b(exam|midterm|final|quiz|test)\b/i.test(title);
}

async function main() {
  const res = await fetch(ICS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Canvas feed: ${res.status}`);
  const text = await res.text();
  const events = parseEvents(text);

  const today = new Date();
  const minDate = new Date(today.getTime() - WINDOW_PAST_DAYS * 86400000);
  const maxDate = new Date(today.getTime() + WINDOW_FUTURE_DAYS * 86400000);

  const rows = [];
  for (const ev of events) {
    if (!ev.uid || !ev.summary || !ev.dtstart) continue;
    const date = parseIcsDate(ev.dtstart);
    if (!date) continue;
    const d = new Date(date + "T00:00:00");
    if (d < minDate || d > maxDate) continue;
    const title = cleanTitle(ev.summary);
    rows.push({
      id: "canvas:" + ev.uid,
      date,
      cls: extractClass(ev.summary),
      title,
      note: "",
      is_exam: looksLikeExam(title),
      source: "canvas",
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`Parsed ${events.length} calendar events, ${rows.length} in window.`);
  if (!rows.length) {
    console.log("Nothing to upsert.");
    return;
  }

  const resp = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/deadlines`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Supabase upsert failed: ${resp.status} ${body}`);
  }

  console.log(`Upserted ${rows.length} deadlines.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
