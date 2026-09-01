/*
  GLOBAL Top-10 Manager Record Board

  Traditional record-board age bands:
    10 & Under -> 10 & Under / 10&U
    11-12      -> 11-12
    13-14      -> 13-14
    15 & Over  -> FASTEST across 15-16, 17-18, 15-18, and OPEN/Open

  Uses the club's own Static/top10.json and reads club branding from its
  existing index.html where possible, so the same files work for every club.
*/
document.addEventListener("DOMContentLoaded", () => {
  const board = document.querySelector("[data-record-board]");
  if (!board) return;

  const course = board.dataset.course;
  const jsonPath = board.dataset.json || "Static/top10.json";
  const tbody = document.getElementById("record-board-body");
  const status = document.getElementById("record-status");
  const titleEl = document.getElementById("record-club-title");
  const logoEl = document.getElementById("record-club-logo");

  const AGE_BANDS = [
    { key: "10U", label: "10 & Under", labels: new Set(["10 & Under", "10&U"]) },
    { key: "11-12", label: "11-12", labels: new Set(["11-12"]) },
    { key: "13-14", label: "13-14", labels: new Set(["13-14"]) },
    { key: "15O", label: "15 & Over", labels: new Set(["15-16", "17-18", "15-18", "OPEN", "Open"]) }
  ];

  const COURSE_EVENTS = {
    SCY: [
      "50 Free", "100 Free", "200 Free", "500 Free", "1000 Free", "1650 Free",
      "50 Back", "100 Back", "200 Back",
      "50 Breast", "100 Breast", "200 Breast",
      "50 Butterfly", "100 Butterfly", "200 Butterfly",
      "100 IM", "200 IM", "400 IM"
    ],
    LCM: [
      "50 Free", "100 Free", "200 Free", "400 Free", "800 Free", "1500 Free",
      "50 Back", "100 Back", "200 Back",
      "50 Breast", "100 Breast", "200 Breast",
      "50 Butterfly", "100 Butterfly", "200 Butterfly",
      "200 IM", "400 IM"
    ]
  };

  const RELAY_EVENTS = [
    "200 Free Relay", "400 Free Relay", "800 Free Relay",
    "200 Medley Relay", "400 Medley Relay"
  ];

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function secondsOf(r) {
    const s = Number(r?.seconds);
    return Number.isFinite(s) ? s : Number.POSITIVE_INFINITY;
  }

  function yearOf(r) {
    const d = String(r?.date || "");
    const m = d.match(/(\d{4})$/);
    return m ? m[1] : "";
  }

  function uniqueKey(r) {
    return [
      r.gender, r.course, r.event, r.name, r.members,
      r.time, r.date, r.meet, r.age_group
    ].join("|");
  }

  function fastest(rows) {
    const seen = new Set();
    const uniqueRows = rows.filter((r) => {
      const key = uniqueKey(r);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return uniqueRows.sort((a, b) =>
      secondsOf(a) - secondsOf(b) ||
      String(a.date || "").localeCompare(String(b.date || ""))
    )[0] || null;
  }

  function recordForBand(records, gender, eventName, band, isRelay = false) {
    return fastest(records.filter((r) =>
      r.course === course &&
      r.gender === gender &&
      r.event === eventName &&
      (isRelay ? r.scope === "relay" : r.scope !== "relay") &&
      band.labels.has(String(r.age_group || "").trim())
    ));
  }

  function recordCell(r, isRelay = false) {
    if (!r) return `<td class="record-cell empty" aria-label="No record"></td>`;

    const name = isRelay ? (r.members || r.name || "Relay") : (r.name || "");
    const metaParts = [];
    if (yearOf(r)) metaParts.push(yearOf(r));
    if (r.meet) metaParts.push(r.meet);

    const title = [
      name, r.time, r.date, r.meet, r.age_group
    ].filter(Boolean).join(" • ");

    return `
      <td class="record-cell${isRelay ? " relay" : ""}" title="${esc(title)}">
        <div class="record">
          <span class="record-name">${esc(name)}</span>
          <span class="record-time">${esc(r.time || "")}</span>
          <span class="record-meta">${esc(metaParts.join(" • "))}</span>
        </div>
      </td>`;
  }

  function eventRow(records, eventName, isRelay = false) {
    const girls = AGE_BANDS.map((band) =>
      recordForBand(records, "F", eventName, band, isRelay)
    );
    const boys = AGE_BANDS.map((band) =>
      recordForBand(records, "M", eventName, band, isRelay)
    );

    return `
      <tr>
        ${girls.map((r) => recordCell(r, isRelay)).join("")}
        <th scope="row" class="event-cell">${esc(eventName)}</th>
        ${boys.slice().reverse().map((r) => recordCell(r, isRelay)).join("")}
      </tr>`;
  }

  function sectionRow(label) {
    return `<tr class="section-row"><th colspan="9">${esc(label)}</th></tr>`;
  }

  function applyBranding(meta) {
    const clubName = meta?.club_name || meta?.heading || "Club";
    titleEl.textContent = `${clubName} All-Time Records`;
    document.title = `${clubName} ${course} Records`;

    // Reuse the club's existing logo from index.html, avoiding club-specific code.
    fetch("index.html", { cache: "no-store" })
      .then((r) => r.ok ? r.text() : "")
      .then((html) => {
        if (!html) return;
        const doc = new DOMParser().parseFromString(html, "text/html");
        const img = doc.querySelector(".club-logo") || doc.querySelector("header img");
        if (img?.getAttribute("src")) {
          logoEl.src = img.getAttribute("src");
          logoEl.alt = `${clubName} logo`;
          logoEl.classList.add("ready");
        }
      })
      .catch(() => {});
  }

  fetch(jsonPath, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} loading ${jsonPath}`);
      return response.json();
    })
    .then((data) => {
      const records = Array.isArray(data?.records) ? data.records : [];
      if (!records.length) throw new Error("No records in JSON.");

      applyBranding(data?.meta || {});

      let html = sectionRow("Individual Records");
      html += (COURSE_EVENTS[course] || []).map((eventName) =>
        eventRow(records, eventName, false)
      ).join("");

      html += sectionRow("Relay Records");
      html += RELAY_EVENTS.map((eventName) =>
        eventRow(records, eventName, true)
      ).join("");

      tbody.innerHTML = html;
      status.hidden = true;

      const generated = data?.meta?.generated_at;
      const metaEl = document.getElementById("data-generated");
      if (metaEl && generated) {
        metaEl.textContent = `Top-10 data generated ${generated}`;
      }
    })
    .catch((error) => {
      console.error("Record board load failed:", error);
      status.hidden = false;
      status.textContent = `Unable to load record data from ${jsonPath}.`;
    });
});
