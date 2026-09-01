/* ============================================================
   GLOBAL SWIM TOP 10 DASHBOARD
   Works with HNVR, SCSC, _TEMPLATE, and future clubs.

   Reads:
     Static/top10.json

   Expected HTML IDs:
     #club-logo
     #club-heading
     #course
     #gender
     #age_group_desc
     #event
     #results-table
     #results-subtitle
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* ==========================================================
     ELEMENTS
     ========================================================== */

  const $ = (id) => document.getElementById(id);

  const clubLogo = $("club-logo");
  const clubHeading = $("club-heading");

  const courseSelect = $("course");
  const genderSelect = $("gender");
  const ageSelect = $("age_group_desc");
  const eventSelect = $("event");

  const resultsTable = $("results-table");
  const resultsSubtitle = $("results-subtitle");

  const JSON_PATH = "Static/top10.json";

  let records = [];


  /* ==========================================================
     DISPLAY LABELS
     ========================================================== */

  const GENDER_LABELS = {
    F: "Female",
    M: "Male",
    X: "Mixed"
  };


  /*
    The actual event value stays unchanged.

    Example:

      value = "500 Free"
      display = "400/500 Free"

    This prevents SCY and LCM events from being incorrectly
    combined internally.
  */

  const EVENT_LABELS = {
    "400 Free": "400/500 Free",
    "500 Free": "400/500 Free",

    "800 Free": "800/1000 Free",
    "1000 Free": "800/1000 Free",

    "1500 Free": "1500/1650 Free",
    "1650 Free": "1500/1650 Free"
  };


  /* ==========================================================
     EVENT ORDER
     ========================================================== */

  const EVENT_ORDER = [

    /* Freestyle */
    "25 Free",
    "50 Free",
    "100 Free",
    "200 Free",
    "400 Free",
    "500 Free",
    "800 Free",
    "1000 Free",
    "1500 Free",
    "1650 Free",

    /* Backstroke */
    "25 Back",
    "50 Back",
    "100 Back",
    "200 Back",

    /* Breaststroke */
    "25 Breast",
    "50 Breast",
    "100 Breast",
    "200 Breast",

    /* Butterfly */
    "25 Butterfly",
    "50 Butterfly",
    "100 Butterfly",
    "200 Butterfly",

    /* Individual Medley */
    "100 IM",
    "200 IM",
    "400 IM",

    /* Freestyle Relays */
    "200 Free Relay",
    "400 Free Relay",
    "800 Free Relay",

    /* Medley Relays */
    "200 Medley Relay",
    "400 Medley Relay"
  ];


  /* ==========================================================
     UTILITIES
     ========================================================== */

  const unique = (values) =>
    [...new Set(values.filter(Boolean))];


  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");


  /* ==========================================================
     AGE GROUP SORTING
     ========================================================== */

  function ageSortKey(label) {

    const value = String(label || "").trim();

    /*
      OPEN always goes last.
    */

    if (
      value.toLowerCase() === "open" ||
      value.toUpperCase() === "OPEN"
    ) {
      return [999, 9, value];
    }


    /*
      Single-age groups:

        Age 5
        Age 6
        ...
        Age 21
    */

    const singleAge =
      value.match(/^Age\s+(\d+)$/i);

    if (singleAge) {
      return [
        Number(singleAge[1]),
        0,
        value
      ];
    }


    /*
      Traditional groups:

        6&U
        7-8
        8 & Under
        9-10
        10 & Under
        11-12
        13-14
        15-16
        15-18
        17-18
        19 & Over
    */

    const numbers =
      value.match(/\d+/g);

    return [
      numbers
        ? Number(numbers[0])
        : 998,

      1,

      value
    ];
  }


  function sortAgeGroups(a, b) {

    const x = ageSortKey(a);
    const y = ageSortKey(b);

    return (
      x[0] - y[0] ||
      x[1] - y[1] ||
      x[2].localeCompare(y[2])
    );
  }


  /* ==========================================================
     GENDER SORTING
     ========================================================== */

  function sortGenders(a, b) {

    const order = [
      "F",
      "M",
      "X"
    ];

    const ia =
      order.indexOf(a);

    const ib =
      order.indexOf(b);

    return (
      (ia === -1 ? 999 : ia) -
      (ib === -1 ? 999 : ib)
    );
  }


  /* ==========================================================
     EVENT SORTING
     ========================================================== */

  function sortEvents(a, b) {

    const ia =
      EVENT_ORDER.indexOf(a);

    const ib =
      EVENT_ORDER.indexOf(b);

    if (
      ia !== -1 ||
      ib !== -1
    ) {

      return (
        (ia === -1 ? 999 : ia) -
        (ib === -1 ? 999 : ib)
      );
    }

    return a.localeCompare(b);
  }


  /* ==========================================================
     SELECT OPTION BUILDER
     ========================================================== */

  function setOptions(
    select,
    values,
    labeler = (value) => value,
    preserveSelection = true
  ) {

    if (!select) {
      return;
    }

    const previous =
      preserveSelection
        ? select.value
        : "";


    select.innerHTML =
      values
        .map((value) => {

          const label =
            labeler(value);

          return `
            <option value="${escapeHtml(value)}">
              ${escapeHtml(label)}
            </option>
          `;

        })
        .join("");


    /*
      Preserve current selection whenever it
      still exists after cascading.
    */

    if (
      previous &&
      values.includes(previous)
    ) {

      select.value =
        previous;
    }
  }


  /* ==========================================================
     FILTERED DATASETS
     ========================================================== */

  function rowsForCourse() {

    return records.filter((record) =>

      !courseSelect.value ||

      record.course ===
        courseSelect.value

    );
  }


  function rowsForGender() {

    return rowsForCourse()
      .filter((record) =>

        !genderSelect.value ||

        record.gender ===
          genderSelect.value

      );
  }


  function rowsForAge() {

    return rowsForGender()
      .filter((record) =>

        !ageSelect.value ||

        record.age_group ===
          ageSelect.value

      );
  }


  function selectedRows() {

    return rowsForAge()
      .filter((record) =>

        !eventSelect.value ||

        record.event ===
          eventSelect.value

      );
  }


  /* ==========================================================
     CASCADING SELECTS
     ========================================================== */

  function refreshGender() {

    const genders =
      unique(
        rowsForCourse()
          .map((record) =>
            record.gender
          )
      )
      .sort(sortGenders);


    setOptions(
      genderSelect,
      genders,

      (gender) =>
        GENDER_LABELS[gender] ||
        gender
    );
  }


  function refreshAge() {

    const ages =
      unique(
        rowsForGender()
          .map((record) =>
            record.age_group
          )
      )
      .sort(sortAgeGroups);


    setOptions(
      ageSelect,
      ages
    );
  }


  function refreshEvent() {

    const events =
      unique(
        rowsForAge()
          .map((record) =>
            record.event
          )
      )
      .sort(sortEvents);


    setOptions(
      eventSelect,
      events,

      (eventName) =>
        EVENT_LABELS[eventName] ||
        eventName
    );
  }


  /* ==========================================================
     RESULT RENDERING
     ========================================================== */

  function render() {

    if (!resultsTable) {
      return;
    }


    const rows =
      selectedRows()
        .slice()
        .sort((a, b) => {

          const secondsA =
            Number.isFinite(
              Number(a.seconds)
            )
              ? Number(a.seconds)
              : Number.POSITIVE_INFINITY;


          const secondsB =
            Number.isFinite(
              Number(b.seconds)
            )
              ? Number(b.seconds)
              : Number.POSITIVE_INFINITY;


          return (
            secondsA -
              secondsB ||

            Number(
              a.rank ?? 999
            ) -

            Number(
              b.rank ?? 999
            )
          );

        })
        .slice(0, 10);


    /* --------------------------------------------------------
       SUBTITLE
       -------------------------------------------------------- */

    if (resultsSubtitle) {

      const eventLabel =
        EVENT_LABELS[
          eventSelect.value
        ] ||
        eventSelect.value;


      resultsSubtitle.textContent =
        [
          courseSelect.value,

          GENDER_LABELS[
            genderSelect.value
          ] ||
            genderSelect.value,

          ageSelect.value,

          eventLabel
        ]
        .filter(Boolean)
        .join(" • ");
    }


    /* --------------------------------------------------------
       NO RESULTS
       -------------------------------------------------------- */

    if (!rows.length) {

      resultsTable.innerHTML = `
        <tr class="show">
          <td
            colspan="5"
            style="text-align:center"
          >
            No results found
          </td>
        </tr>
      `;

      return;
    }


    /* --------------------------------------------------------
       RESULTS
       -------------------------------------------------------- */

    resultsTable.innerHTML =
      rows
        .map((record, index) => {

          /*
            Relay records normally use `members`.

            Individual records normally use `name`.
          */

          const displayName =
            record.scope === "relay"

              ? (
                  record.members ||
                  record.name ||
                  "Relay"
                )

              : (
                  record.name ||
                  record.members ||
                  ""
                );


          return `
            <tr>

              <td data-label="Rank">
                ${escapeHtml(
                  record.rank ??
                  index + 1
                )}
              </td>

              <td data-label="Name">
                ${escapeHtml(
                  displayName
                )}
              </td>

              <td data-label="Swim Time">
                ${escapeHtml(
                  record.time || ""
                )}
              </td>

              <td data-label="Date">
                ${escapeHtml(
                  record.date || ""
                )}
              </td>

              <td data-label="Meet">
                ${escapeHtml(
                  record.meet || ""
                )}
              </td>

            </tr>
          `;

        })
        .join("");


    /*
      Add the CSS reveal class after rows
      have entered the DOM.
    */

    requestAnimationFrame(() => {

      resultsTable
        .querySelectorAll("tr")
        .forEach((row) => {

          row.classList.add(
            "show"
          );

        });

    });
  }


  /* ==========================================================
     CASCADE HANDLERS
     ========================================================== */

  function cascadeFromCourse() {

    refreshGender();
    refreshAge();
    refreshEvent();

    render();
  }


  function cascadeFromGender() {

    refreshAge();
    refreshEvent();

    render();
  }


  function cascadeFromAge() {

    refreshEvent();

    render();
  }


  /* ==========================================================
     CLUB BRANDING
     ========================================================== */

  function applyClubBranding(meta) {

    if (!meta) {
      return;
    }


    /* --------------------------------------------------------
       PAGE TITLE
       -------------------------------------------------------- */

    if (meta.page_title) {

      document.title =
        meta.page_title;

    }
    else if (meta.club_name) {

      document.title =
        `${meta.club_name} All-Time Top 10`;

    }


    /* --------------------------------------------------------
       HEADING
       -------------------------------------------------------- */

    if (clubHeading) {

      if (meta.heading) {

        clubHeading.textContent =
          meta.heading;

      }
      else if (meta.club_name) {

        clubHeading.textContent =
          `${meta.club_name.toUpperCase()} ALL-TIME TOP 10 TIMES`;

      }
    }


    /* --------------------------------------------------------
       LOGO

       Existing HTML src takes priority.

       This lets SCSC keep:
         Static/SCSC_LOGO.png

       while other clubs can provide a logo
       through JSON metadata/template configuration.
       -------------------------------------------------------- */

    if (clubLogo) {

      let logoSource =
        clubLogo.getAttribute("src");


      if (
        !logoSource &&
        meta.logo
      ) {

        logoSource =
          meta.logo;

        clubLogo.src =
          logoSource;
      }


      if (logoSource) {

        clubLogo.style.display =
          "block";


        if (
          !clubLogo.alt &&
          meta.club_name
        ) {

          clubLogo.alt =
            `${meta.club_name} logo`;
        }
      }
    }
  }


  /* ==========================================================
     LOAD JSON
     ========================================================== */

  fetch(
    JSON_PATH,
    {
      cache: "no-store"
    }
  )

    .then((response) => {

      if (!response.ok) {

        throw new Error(
          `HTTP ${response.status} loading ${JSON_PATH}`
        );
      }

      return response.json();
    })


    .then((data) => {

      /* ------------------------------------------------------
         RECORDS
         ------------------------------------------------------ */

      records =
        Array.isArray(
          data?.records
        )

          ? data.records

          : [];


      if (!records.length) {

        throw new Error(
          "top10.json contains no records"
        );
      }


      /* ------------------------------------------------------
         CLUB BRANDING
         ------------------------------------------------------ */

      applyClubBranding(
        data?.meta || {}
      );


      /* ------------------------------------------------------
         INITIAL COURSE LIST
         ------------------------------------------------------ */

      const courses =
        unique(
          records.map(
            (record) =>
              record.course
          )
        )
        .sort();


      setOptions(
        courseSelect,
        courses,
        (course) => course,
        false
      );


      /* ------------------------------------------------------
         INITIALIZE EVERYTHING
         ------------------------------------------------------ */

      cascadeFromCourse();
    })


    .catch((error) => {

      console.error(
        "Top 10 data load failed:",
        error
      );


      if (resultsTable) {

        resultsTable.innerHTML = `
          <tr class="show">

            <td
              colspan="5"
              style="text-align:center"
            >
              Unable to load Top 10 data.
            </td>

          </tr>
        `;
      }


      if (resultsSubtitle) {

        resultsSubtitle.textContent =
          "Check Static/top10.json";
      }
    });


  /* ==========================================================
     EVENT LISTENERS
     ========================================================== */

  courseSelect?.addEventListener(
    "change",
    cascadeFromCourse
  );


  genderSelect?.addEventListener(
    "change",
    cascadeFromGender
  );


  ageSelect?.addEventListener(
    "change",
    cascadeFromAge
  );


  eventSelect?.addEventListener(
    "change",
    render
  );

});