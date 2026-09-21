window.LectioEnhancer = window.LectioEnhancer || {};

(function () {
  "use strict";

  const TABLE_ID = "s_m_Content_Content_TidsregInputGV";
  const SEND_TO_ID = "s_m_Content_Content_SendToArea1";
  const BAR_CLASS = "lectio-enhancer-tidsreg-summary";
  const WEEK_REPORT_TABLE_ID = "s_m_Content_Content_TidsregWeekReportGV";
  const WEEK_DATA_PANEL_CLASS = "lectio-enhancer-tidsreg-weekdatapanel";
  const SEND_TO_AREA2_ID = "s_m_Content_Content_SendToArea2";
  const PAYROLL_FILTER_STORAGE_KEY = "lectioEnhancerTidsregPayrollYear";
  const HIDE_MONEY_STORAGE_KEY = "lectioEnhancerTidsregHideMoney";

  /** Normtimer pr. uge — timer herover tillægges med {@link OVERTIME_DKK_PER_HOUR}. */
  const WEEK_NORM_HOURS = 37;
  /** Sats for timer over norm (kr/t, vejledende). */
  const OVERTIME_DKK_PER_HOUR = 341;
  /** Reference: forventet gennemsnitlig arbejdstid pr. uge (kun visning). */
  const WEEK_EXPECTED_AVG_HOURS = 45;

  let bodyObserver = null;
  let debounceTimer = null;

  function pathnameMatch() {
    return /laerer_aarsopgoerelse\.aspx/i.test(window.location.pathname);
  }

  function shouldActivate() {
    if (!pathnameMatch()) return false;
    const lectab = new URLSearchParams(window.location.search).get("lectab");
    if (lectab === "tidsregistrering") return true;
    return !!document.getElementById(TABLE_ID);
  }

  function parseDanishNumber(text) {
    if (text == null || text === "") return NaN;
    const s = String(text)
      .trim()
      .replace(/\s/g, "")
      .replace(/\u00a0/g, "");
    if (!s) return NaN;
    const normalized = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatDanishHours(n) {
    if (!Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 100) / 100;
    return String(rounded).replace(".", ",");
  }

  function formatDkk(n) {
    if (!Number.isFinite(n)) return "—";
    const rounded = Math.round(n);
    return (
      new Intl.NumberFormat("da-DK", {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      }).format(rounded) + " kr"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function startOfLocalDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Mandag i uge 1 for ISO-år `isoYear`. */
  function isoWeekOneMonday(isoYear) {
    const jan4 = new Date(isoYear, 0, 4);
    const wd = jan4.getDay() || 7;
    const mon = new Date(jan4);
    mon.setDate(jan4.getDate() - (wd - 1));
    return mon;
  }

  /**
   * ISO 8601 ugenummer og ISO-ugeår (året for ugenes torsdag / ISO-standard).
   * Matcher danske skoleuger i Lectio.
   */
  function getISOWeekParts(date) {
    const d = startOfLocalDay(date);
    let y = d.getFullYear();
    let w1 = isoWeekOneMonday(y);
    if (d < w1) {
      y -= 1;
      w1 = isoWeekOneMonday(y);
    }
    const w2 = isoWeekOneMonday(y + 1);
    if (d >= w2) {
      y += 1;
      w1 = w2;
    }
    const week = 1 + Math.floor((d - w1) / (7 * 86400000));
    return { isoYear: y, week };
  }

  /**
   * Lectio viser kun ugenummer (1–53). Find ISO-ugeår for den uge i skoleperioden.
   */
  function payrollIsoYearForWeekNumber(weekNum, periodStart, periodEnd) {
    const ps = startOfLocalDay(periodStart);
    const pe = startOfLocalDay(periodEnd);
    for (let t = ps.getTime(); t <= pe.getTime(); t += 86400000) {
      const d = new Date(t);
      const p = getISOWeekParts(d);
      if (p.week === weekNum) return p.isoYear;
    }
    return null;
  }

  function parseSchoolPeriodString(text) {
    if (!text) return null;
    const m = String(text)
      .trim()
      .match(/(\d{2})-(\d{2})-(\d{4})\s*-\s*(\d{2})-(\d{2})-(\d{4})/);
    if (!m) return null;
    const d1 = parseInt(m[1], 10);
    const mo1 = parseInt(m[2], 10) - 1;
    const y1 = parseInt(m[3], 10);
    const d2 = parseInt(m[4], 10);
    const mo2 = parseInt(m[5], 10) - 1;
    const y2 = parseInt(m[6], 10);
    const start = new Date(y1, mo1, d1);
    const end = new Date(y2, mo2, d2);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end, label: String(text).trim() };
  }

  function parseSchoolPeriodFromDom() {
    const root = document.getElementById(SEND_TO_AREA2_ID);
    if (!root) return null;
    const nowrap = root.querySelector(".title-small span.nowrap");
    if (!nowrap) return null;
    return parseSchoolPeriodString(nowrap.textContent);
  }

  function collectPayrollIsoYearsInPeriod(period) {
    const years = new Set();
    const ps = startOfLocalDay(period.start);
    const pe = startOfLocalDay(period.end);
    for (let t = ps.getTime(); t <= pe.getTime(); t += 86400000) {
      years.add(getISOWeekParts(new Date(t)).isoYear);
    }
    return Array.from(years).sort((a, b) => a - b);
  }

  function getStoredPayrollFilter(availableYears) {
    const raw = sessionStorage.getItem(PAYROLL_FILTER_STORAGE_KEY);
    if (!raw || raw === "all") return "all";
    const y = parseInt(raw, 10);
    if (!Number.isFinite(y) || !availableYears.includes(y)) return "all";
    return String(y);
  }

  function isHideMoney() {
    return sessionStorage.getItem(HIDE_MONEY_STORAGE_KEY) === "1";
  }

  function buildPrivacyToggleHtml() {
    const hideMoney = isHideMoney();
    return `<div class="lectio-enhancer-tidsreg-privacybar">
      <label class="lectio-enhancer-tidsreg-privacy-opt">
        <input type="checkbox" name="lectio-hide-money"${hideMoney ? " checked" : ""}/>
        <span>Skjul tillæg og <strong>beløb</strong> (kun timer — egnet til fx dialog med leder)</span>
      </label>
    </div>`;
  }

  function enrichWeekItemsWithPayrollYear(items, period) {
    if (!period) {
      return items.map((i) => ({ ...i, payrollIsoYear: null }));
    }
    return items.map((i) => ({
      ...i,
      payrollIsoYear: payrollIsoYearForWeekNumber(i.weekNum, period.start, period.end),
    }));
  }

  function filterWeekItemsByPayroll(items, mode) {
    if (!mode || mode === "all") return items;
    const y = parseInt(mode, 10);
    if (!Number.isFinite(y)) return items;
    return items.filter((i) => i.payrollIsoYear === y);
  }

  function getRowWeekKey(tr) {
    const mobile = tr.querySelector(".tidsreg-table-mobile");
    if (!mobile) return "_";
    const divs = mobile.querySelectorAll(":scope > div");
    if (divs.length < 3) return "_";
    const raw = divs[2].textContent.replace(/\u00a0/g, "").trim();
    const week = parseInt(raw, 10);
    return Number.isFinite(week) ? String(week) : "_";
  }

  function getRowHours(tr) {
    const cells = tr.querySelectorAll("td");
    if (cells.length < 6) return NaN;

    const timetalCell = cells[4];
    const timerCell = cells[5];
    const inp = timetalCell.querySelector('input[id$="TidsregInputHoursTB_tb"]');

    if (inp && !inp.disabled) {
      const v = inp.value.trim();
      if (v !== "") {
        const parsed = parseDanishNumber(v);
        return Number.isFinite(parsed) ? parsed : NaN;
      }
      const fallback = parseDanishNumber(timerCell.textContent);
      return Number.isFinite(fallback) ? fallback : 0;
    }

    const fromTimer = parseDanishNumber(timerCell.textContent);
    return Number.isFinite(fromTimer) ? fromTimer : 0;
  }

  function getRowDagsnorm(tr) {
    const span = tr.querySelector("td:first-child span[title]");
    if (!span) return NaN;
    const title = span.getAttribute("title") || "";
    const m = title.match(/Dagsnorm:\s*([\d.,]+)/i);
    if (!m) return NaN;
    return parseDanishNumber(m[1]);
  }

  function collectWeekAggregates(table) {
    const rows = table.querySelectorAll("tbody tr");
    const byWeek = new Map();

    rows.forEach((tr) => {
      if (tr.querySelector("th")) return;
      const cells = tr.querySelectorAll("td");
      if (cells.length < 6) return;

      const weekKey = getRowWeekKey(tr);
      const hours = getRowHours(tr);
      if (!Number.isFinite(hours)) return;

      const dagsnorm = getRowDagsnorm(tr);
      let agg = byWeek.get(weekKey);
      if (!agg) {
        agg = { sum: 0, expected: 0, hasExpected: false };
        byWeek.set(weekKey, agg);
      }
      agg.sum += hours;
      if (Number.isFinite(dagsnorm) && dagsnorm > 0) {
        agg.expected += dagsnorm;
        agg.hasExpected = true;
      }
    });

    return byWeek;
  }

  function renderSummaryHtml(byWeek) {
    if (byWeek.size === 0) {
      return "<span class=\"lectio-enhancer-tidsreg-summary-empty\">Ingen timer at summere.</span>";
    }

    const keys = Array.from(byWeek.keys()).sort((a, b) => {
      if (a === "_") return 1;
      if (b === "_") return -1;
      return parseInt(a, 10) - parseInt(b, 10);
    });

    const parts = keys.map((key) => {
      const agg = byWeek.get(key);
      const label = key === "_" ? "Denne visning" : `Uge ${key}`;
      let line = `<span class="lectio-enhancer-tidsreg-weekline"><span class="lectio-enhancer-tidsreg-weeklabel">${label}</span> — sum: <strong>${formatDanishHours(agg.sum)}</strong> t`;
      if (agg.hasExpected && agg.expected > 0) {
        line += ` <span class="lectio-enhancer-tidsreg-expected">(forventet norm ~ ${formatDanishHours(agg.expected)} t)</span>`;
      }
      line += "</span>";
      return line;
    });

    return `<div class="lectio-enhancer-tidsreg-summary-inner">${parts.join("")}</div>`;
  }

  function parseWeekReportData(weekTable) {
    const rows = weekTable.querySelectorAll("tbody tr");
    const items = [];

    rows.forEach((tr) => {
      if (tr.querySelector("th")) return;
      const tds = tr.querySelectorAll("td");
      if (tds.length < 3) return;
      const weekLabel = tds[0].textContent.replace(/\u00a0/g, "").trim();
      if (/^sum$/i.test(weekLabel)) return;

      const weekNum = parseInt(weekLabel, 10);
      if (!Number.isFinite(weekNum)) return;

      const hours = parseDanishNumber(tds[1].textContent);
      if (!Number.isFinite(hours)) return;

      const detail = tds[2].textContent.replace(/\s+/g, " ").trim();
      items.push({ weekNum, hours, detail });
    });

    return items;
  }

  function buildWeekDataPanelHtml(
    filteredItems,
    period,
    availableYears,
    selectedFilter,
    emptyDetail
  ) {
    const hideMoney = isHideMoney();

    if (filteredItems.length === 0) {
      const emptyMsg =
        emptyDetail === "no-rows"
          ? "Ingen uger at vise i tabellen."
          : "Ingen uger matcher filteret — prøv et andet lønår eller «Hele skoleåret».";
      const disc = hideMoney
        ? "<p class=\"lectio-enhancer-tidsreg-weekdata-disclaimer\">Oversigt ud fra tabellen ovenfor.</p>"
        : "<p class=\"lectio-enhancer-tidsreg-weekdata-disclaimer\">Vejledende beregning ud fra tabellen ovenfor. Tjek altid egen aftale/lønseddel.</p>";
      return (
        buildPayrollFiltersHtml(period, availableYears, selectedFilter) +
        buildPrivacyToggleHtml() +
        `<p class="lectio-enhancer-tidsreg-weekdata-empty">${emptyMsg}</p>` +
        disc
      );
    }

    let sumHours = 0;
    let sumOverNorm = 0;
    let sumDkk = 0;
    let sumOverSnit = 0;
    let sumDiffSnit = 0;

    const bodyRows = filteredItems
      .map((row) => {
        const overNorm = Math.max(0, row.hours - WEEK_NORM_HOURS);
        const dkk = overNorm * OVERTIME_DKK_PER_HOUR;
        const diffSnit = row.hours - WEEK_EXPECTED_AVG_HOURS;
        const overSnit = Math.max(0, row.hours - WEEK_EXPECTED_AVG_HOURS);

        sumHours += row.hours;
        sumOverNorm += overNorm;
        sumDkk += dkk;
        sumOverSnit += overSnit;
        sumDiffSnit += diffSnit;

        let rowClass = "";
        if (hideMoney) {
          if (overSnit > 0) rowClass = " lectio-enhancer-tidsreg-weekdata-tr--over45";
        } else if (overNorm > 0) {
          rowClass = " lectio-enhancer-tidsreg-weekdata-tr--over";
        }

        const diffClass =
          diffSnit >= 0
            ? "lectio-enhancer-tidsreg-diff--pos"
            : "lectio-enhancer-tidsreg-diff--neg";

        const yearHint =
          row.payrollIsoYear != null
            ? `<span class="lectio-enhancer-tidsreg-weekdata-isoyear" title="ISO-ugeår (kalender/løn)">’${String(row.payrollIsoYear).slice(-2)}</span>`
            : "";

        if (hideMoney) {
          return `<tr class="${rowClass}">
          <td class="lectio-enhancer-tidsreg-weekdata-week">${escapeHtml(String(row.weekNum))}${yearHint}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num">${formatDanishHours(row.hours)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num">${formatDanishHours(overSnit)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num ${diffClass}">${diffSnit >= 0 ? "+" : ""}${formatDanishHours(diffSnit)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-detail" title="${escapeHtml(row.detail)}">${escapeHtml(row.detail)}</td>
        </tr>`;
        }

        return `<tr class="${rowClass}">
          <td class="lectio-enhancer-tidsreg-weekdata-week">${escapeHtml(String(row.weekNum))}${yearHint}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num">${formatDanishHours(row.hours)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num">${formatDanishHours(overNorm)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num lectio-enhancer-tidsreg-weekdata-money">${formatDkk(dkk)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num">${formatDanishHours(overSnit)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-num ${diffClass}">${diffSnit >= 0 ? "+" : ""}${formatDanishHours(diffSnit)}</td>
          <td class="lectio-enhancer-tidsreg-weekdata-detail" title="${escapeHtml(row.detail)}">${escapeHtml(row.detail)}</td>
        </tr>`;
      })
      .join("");

    const footHide = `<tr class="lectio-enhancer-tidsreg-weekdata-tr--sum">
      <td class="lectio-enhancer-tidsreg-weekdata-week">Σ (${filteredItems.length} uger)</td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${formatDanishHours(sumHours)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${formatDanishHours(sumOverSnit)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${sumDiffSnit >= 0 ? "+" : ""}${formatDanishHours(sumDiffSnit)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-detail"></td>
    </tr>`;

    const footFull = `<tr class="lectio-enhancer-tidsreg-weekdata-tr--sum">
      <td class="lectio-enhancer-tidsreg-weekdata-week">Σ (${filteredItems.length} uger)</td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${formatDanishHours(sumHours)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${formatDanishHours(sumOverNorm)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num lectio-enhancer-tidsreg-weekdata-money"><strong>${formatDkk(sumDkk)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${formatDanishHours(sumOverSnit)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-num"><strong>${sumDiffSnit >= 0 ? "+" : ""}${formatDanishHours(sumDiffSnit)}</strong></td>
      <td class="lectio-enhancer-tidsreg-weekdata-detail"></td>
    </tr>`;

    const foot = hideMoney ? footHide : footFull;

    const theadHide = `<tr>
              <th scope="col">Uge</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Timer</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Over ${WEEK_EXPECTED_AVG_HOURS} t</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Afvigelse vs ${WEEK_EXPECTED_AVG_HOURS} t</th>
              <th scope="col">Udspecificeret</th>
            </tr>`;

    const theadFull = `<tr>
              <th scope="col">Uge</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Timer</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Over ${WEEK_NORM_HOURS} t</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Tillæg</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Over ${WEEK_EXPECTED_AVG_HOURS} t</th>
              <th scope="col" class="lectio-enhancer-tidsreg-weekdata-num">Afvigelse vs ${WEEK_EXPECTED_AVG_HOURS} t</th>
              <th scope="col">Udspecificeret</th>
            </tr>`;

    const filterHint =
      selectedFilter !== "all"
        ? hideMoney
          ? `<p class="lectio-enhancer-tidsreg-payroll-hint">Viser kun uger med <strong>ISO-ugeår ${escapeHtml(
              selectedFilter
            )}</strong> (svarer typisk til kalenderår <strong>${escapeHtml(
              selectedFilter
            )}</strong>).</p>`
          : `<p class="lectio-enhancer-tidsreg-payroll-hint">Viser kun uger med <strong>ISO-ugeår ${escapeHtml(
              selectedFilter
            )}</strong> — typisk det, der matcher <strong>kalenderår ${escapeHtml(
              selectedFilter
            )}</strong> i lønsystemer (skoleår går ellers på tværs).</p>`
        : "";

    const metaHide = `<p class="lectio-enhancer-tidsreg-weekdata-meta">
          Planlagt snit <strong>${WEEK_EXPECTED_AVG_HOURS} t</strong> pr. uge: «Over ${WEEK_EXPECTED_AVG_HOURS}» er timer <em>over</em> snittet (sum i bunden).
          «Afvigelse» er forskellen pr. uge (positiv = over snit). Ugentlig norm <strong>${WEEK_NORM_HOURS} t</strong> vises ikke her.
        </p>`;

    const metaFull = `<p class="lectio-enhancer-tidsreg-weekdata-meta">
          Norm <strong>${WEEK_NORM_HOURS} t</strong> pr. uge: timer derover medregnes med <strong>${OVERTIME_DKK_PER_HOUR} kr/t</strong> (tillæg).
          Planlagt snit <strong>${WEEK_EXPECTED_AVG_HOURS} t</strong>: kolonnerne «Over ${WEEK_EXPECTED_AVG_HOURS}» og «Afvigelse» følger det snit (ikke løn i sig selv).
        </p>`;

    const disclaimer = hideMoney
      ? "<p class=\"lectio-enhancer-tidsreg-weekdata-disclaimer\">Oversigt ud fra tabellen ovenfor — til eget brug.</p>"
      : "<p class=\"lectio-enhancer-tidsreg-weekdata-disclaimer\">Vejledende beregning ud fra tabellen ovenfor. Tjek altid egen aftale/lønseddel.</p>";

    const tableAria = hideMoney
      ? "Ugeoversigt (timer)"
      : "Ugeoversigt med tillæg";

    return (
      buildPayrollFiltersHtml(period, availableYears, selectedFilter) +
      buildPrivacyToggleHtml() +
      filterHint +
      `<div class="lectio-enhancer-tidsreg-weekdata-head">
        <h4 class="lectio-enhancer-tidsreg-weekdata-title">Lectio Enhancer — ugedata</h4>
        ${hideMoney ? metaHide : metaFull}
      </div>
      <div class="lectio-enhancer-tidsreg-weekdata-tablewrap">
        <table class="lectio-enhancer-tidsreg-weekdata-table" aria-label="${escapeHtml(tableAria)}">
          <thead>
            ${hideMoney ? theadHide : theadFull}
          </thead>
          <tbody>${bodyRows}${foot}</tbody>
        </table>
      </div>
      ${disclaimer}`
    );
  }

  function buildPayrollFiltersHtml(period, availableYears, selectedFilter) {
    if (!period || !availableYears || availableYears.length === 0) {
      return "";
    }

    const hideMoney = isHideMoney();
    const legend = hideMoney
      ? "Visning (skoleår vs kalenderår)"
      : "Visning (skoleår vs kalender/løn)";
    const yearMain = hideMoney ? "Kalenderår" : "Lønår";

    const periodEsc = escapeHtml(period.label);
    const radios = [
      `<label class="lectio-enhancer-tidsreg-payroll-opt">
        <input type="radio" name="lectio-payroll-yr" value="all"${selectedFilter === "all" ? " checked" : ""}/>
        <span class="lectio-enhancer-tidsreg-payroll-opt-main">Hele skoleåret</span>
        <span class="lectio-enhancer-tidsreg-payroll-opt-sub">${periodEsc}</span>
      </label>`,
    ];

    availableYears.forEach((y) => {
      const checked = selectedFilter === String(y) ? " checked" : "";
      const firstY = availableYears[0];
      const lastY = availableYears[availableYears.length - 1];
      let short = `ISO-uger i ${y}`;
      if (availableYears.length > 1) {
        if (y === firstY) short += " · typisk aug–dec";
        else if (y === lastY) short += " · typisk jan–jul";
        else short += " · midt i skoleår";
      }
      radios.push(`<label class="lectio-enhancer-tidsreg-payroll-opt">
        <input type="radio" name="lectio-payroll-yr" value="${y}"${checked}/>
        <span class="lectio-enhancer-tidsreg-payroll-opt-main">${yearMain} ${y}</span>
        <span class="lectio-enhancer-tidsreg-payroll-opt-sub">${escapeHtml(short)}</span>
      </label>`);
    });

    return `<fieldset class="lectio-enhancer-tidsreg-payroll-filters">
      <legend class="lectio-enhancer-tidsreg-payroll-legend">${escapeHtml(legend)}</legend>
      <div class="lectio-enhancer-tidsreg-payroll-radios">${radios.join("")}</div>
    </fieldset>`;
  }

  function ensurePayrollFilterListenerOnSendToArea2() {
    const host = document.getElementById(SEND_TO_AREA2_ID);
    if (!host || host.dataset.lectioPayrollDelegated === "1") return;
    host.dataset.lectioPayrollDelegated = "1";
    host.addEventListener("change", function (ev) {
      const t = ev.target;
      if (!t) return;
      if (!t.closest(`.${WEEK_DATA_PANEL_CLASS}`)) return;

      if (t.name === "lectio-hide-money") {
        sessionStorage.setItem(
          HIDE_MONEY_STORAGE_KEY,
          t.checked ? "1" : "0"
        );
        const panel = host.querySelector(`:scope .${WEEK_DATA_PANEL_CLASS}`);
        if (panel) refreshWeekDataPanel(panel);
        return;
      }

      if (t.name !== "lectio-payroll-yr") return;
      sessionStorage.setItem(PAYROLL_FILTER_STORAGE_KEY, t.value);
      const panel = host.querySelector(`:scope .${WEEK_DATA_PANEL_CLASS}`);
      if (panel) refreshWeekDataPanel(panel);
    });
  }

  function refreshWeekDataPanel(panel) {
    const weekTable = document.getElementById(WEEK_REPORT_TABLE_ID);
    if (!weekTable || !panel) return;

    const hideMoney = isHideMoney();
    panel.classList.toggle(
      "lectio-enhancer-tidsreg-weekdatapanel--hide-money",
      hideMoney
    );

    const raw = parseWeekReportData(weekTable);
    const period = parseSchoolPeriodFromDom();
    const enriched = enrichWeekItemsWithPayrollYear(raw, period);
    const availableYears = period
      ? collectPayrollIsoYearsInPeriod(period)
      : Array.from(
          new Set(
            enriched
              .map((i) => i.payrollIsoYear)
              .filter((y) => y != null)
          )
        ).sort((a, b) => a - b);
    const selected = getStoredPayrollFilter(availableYears);
    const filtered = filterWeekItemsByPayroll(enriched, selected);
    if (filtered.length === 0) {
      const emptyDetail = raw.length === 0 ? "no-rows" : "filtered-empty";
      panel.innerHTML = buildWeekDataPanelHtml(
        [],
        period,
        availableYears,
        selected,
        emptyDetail
      );
      return;
    }
    panel.innerHTML = buildWeekDataPanelHtml(
      filtered,
      period,
      availableYears,
      selected
    );
  }

  function bindWeekReportPanel() {
    const weekTable = document.getElementById(WEEK_REPORT_TABLE_ID);
    if (!weekTable) return;

    const wrapper = weekTable.closest(".ls-table-wrapper");
    const insertParent = wrapper && wrapper.parentElement;
    if (!insertParent) return;

    ensurePayrollFilterListenerOnSendToArea2();

    let panel = insertParent.querySelector(`:scope > .${WEEK_DATA_PANEL_CLASS}`);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = WEEK_DATA_PANEL_CLASS;
      insertParent.insertBefore(panel, wrapper.nextSibling);
    }

    if (weekTable.dataset.lectioEnhancerWeekPanelBound !== "1") {
      weekTable.dataset.lectioEnhancerWeekPanelBound = "1";
    }

    refreshWeekDataPanel(panel);
  }

  function removeWeekDataPanel() {
    document.querySelectorAll(`.${WEEK_DATA_PANEL_CLASS}`).forEach((el) => el.remove());
    const wt = document.getElementById(WEEK_REPORT_TABLE_ID);
    if (wt) delete wt.dataset.lectioEnhancerWeekPanelBound;
  }

  function updateSummary(table) {
    const sendTo = document.getElementById(SEND_TO_ID);
    const host = sendTo && sendTo.parentElement;
    if (!host) return;
    const bar = host.querySelector(`:scope > .${BAR_CLASS}`);
    if (!bar) return;

    const byWeek = collectWeekAggregates(table);
    bar.innerHTML = renderSummaryHtml(byWeek);
  }

  function onGridInteraction(ev, table) {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (
      t.matches &&
      (t.matches('input[id$="TidsregInputHoursTB_tb"]') ||
        t.matches('select[id$="TidsregInputTypeDD_dd"]'))
    ) {
      updateSummary(table);
    }
  }

  function bindTable(table) {
    const sendTo = document.getElementById(SEND_TO_ID);
    const host = sendTo && sendTo.parentElement;
    if (!host) return;

    if (table.dataset.lectioEnhancerTidsregBound === "1") {
      updateSummary(table);
      return;
    }
    table.dataset.lectioEnhancerTidsregBound = "1";

    let bar = host.querySelector(`:scope > .${BAR_CLASS}`);
    if (!bar) {
      bar = document.createElement("div");
      bar.className = BAR_CLASS;
      bar.setAttribute("role", "status");
      bar.setAttribute("aria-live", "polite");
      host.insertBefore(bar, sendTo);
    }

    const inputHandler = function (e) {
      onGridInteraction(e, table);
    };
    table.addEventListener("input", inputHandler);
    table.addEventListener("change", inputHandler);

    updateSummary(table);
  }

  function tryAttach() {
    if (!shouldActivate()) {
      document.querySelectorAll(`.${BAR_CLASS}`).forEach((el) => {
        if (!document.getElementById(TABLE_ID)) el.remove();
      });
      removeWeekDataPanel();
      return;
    }

    const table = document.getElementById(TABLE_ID);
    if (table) {
      bindTable(table);
    }
    bindWeekReportPanel();
  }

  function scheduleTryAttach() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(tryAttach, 80);
  }

  window.LectioEnhancer.enhanceTidsregistrering = function () {
    if (!pathnameMatch()) return;

    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }

    bodyObserver = new MutationObserver(scheduleTryAttach);
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    scheduleTryAttach();
  };
})();
