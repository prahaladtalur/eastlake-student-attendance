const API_URL = "https://eastlake-speech-debate-attendance.dtalur.chatgpt.site/api/attendance";
const TARGET_PERCENT = 75;
const EVENT_TYPES = [
  ["speech", "Speech"],
  ["policy", "Policy"],
  ["public_forum", "Public Forum"],
  ["lincoln_douglas", "Lincoln–Douglas"],
  ["unassigned", "Other"],
];

function eastlakeDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function isCountedMonday(meeting) {
  if (meeting.countsTowardAttendance === false || !/^\d{4}-\d{2}-\d{2}$/.test(meeting.meetingDate ?? "")) {
    return false;
  }
  return new Date(`${meeting.meetingDate}T12:00:00Z`).getUTCDay() === 1;
}

export function calculateAttendance(member, meetings, attendance, asOfDate = eastlakeDate()) {
  const countedMeetings = meetings
    .filter((meeting) => isCountedMonday(meeting)
      && meeting.meetingDate >= member.eligibleFrom
      && meeting.meetingDate <= asOfDate)
    .sort((left, right) => left.meetingDate.localeCompare(right.meetingDate));
  const recordsByMeeting = new Map(
    attendance
      .filter((record) => String(record.memberId) === String(member.id))
      .map((record) => [String(record.meetingId), Boolean(record.present)]),
  );
  const firstPresentDate = countedMeetings.find(
    (meeting) => recordsByMeeting.get(String(meeting.id)) === true,
  )?.meetingDate ?? null;
  const eligibleMeetings = firstPresentDate
    ? countedMeetings.filter((meeting) => meeting.meetingDate >= firstPresentDate)
    : [];
  const present = eligibleMeetings.filter(
    (meeting) => recordsByMeeting.get(String(meeting.id)) === true,
  ).length;

  return {
    countedMeetings,
    eligibleMeetings,
    firstPresentDate,
    present,
    percent: eligibleMeetings.length ? (present / eligibleMeetings.length) * 100 : null,
    recordsByMeeting,
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function eventLabel(value) {
  return EVENT_TYPES.find(([key]) => key === value)?.[1] ?? "Other";
}

function formatDate(value) {
  if (!value) return "Not started";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatPercent(value) {
  if (value === null) return "—";
  const rounded = Number(value.toFixed(1));
  if (value < TARGET_PERCENT && rounded >= TARGET_PERCENT) {
    return `${Math.floor(value * 100) / 100}%`;
  }
  return `${rounded}%`;
}

function attendanceStatus(percent) {
  if (percent === null) return "Not started";
  return percent >= TARGET_PERCENT ? "Passing" : "Below 75%";
}

function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function showLoading(root) {
  root.innerHTML = '<div class="loading-card" role="status"><span class="spinner" aria-hidden="true"></span><span>Loading the roster…</span></div>';
}

export function renderStudentApp(root, data, selectedMemberId = null) {
  const members = [...(data.members ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const meetings = data.meetings ?? [];
  const attendance = data.attendance ?? [];
  const selectedMember = members.find((member) => String(member.id) === String(selectedMemberId));

  if (selectedMember) {
    const stats = calculateAttendance(selectedMember, meetings, attendance);
    const percentText = formatPercent(stats.percent);
    const status = attendanceStatus(stats.percent);
    const progress = stats.percent === null ? 0 : Math.min(100, stats.percent);
    const history = stats.eligibleMeetings.map((meeting) => {
      const present = stats.recordsByMeeting.get(String(meeting.id));
      const label = present === true ? "Here" : present === false ? "Away" : "Not recorded";
      const tone = present === true ? "here" : present === false ? "away" : "";
      return `<li class="history-row"><span class="meeting-date">${escapeHtml(formatDate(meeting.meetingDate))}</span><span class="meeting-status ${tone}">${label}</span></li>`;
    }).join("");

    root.innerHTML = `
      <div class="profile-heading">
        <div class="profile-title">
          <span class="avatar" aria-hidden="true">${escapeHtml(initials(selectedMember.name))}</span>
          <div class="profile-name"><p class="eyebrow">${escapeHtml(eventLabel(selectedMember.eventType))}</p><h1 id="student-name">${escapeHtml(selectedMember.name)}</h1></div>
        </div>
        <button class="back-button" type="button" data-action="choose">Choose name</button>
      </div>
      <section class="score-card" aria-label="Attendance percentage">
        <div class="score-top">
          <div><p class="score-label">Your attendance</p><p class="score-value">${escapeHtml(percentText)}</p><p class="score-status">${escapeHtml(status)} · ${TARGET_PERCENT}% needed</p></div>
          <span class="status-pill ${stats.percent === null ? "" : stats.percent >= TARGET_PERCENT ? "passing" : "below"}">${escapeHtml(status)}</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Attendance percentage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><div class="progress-fill" style="width: ${progress}%"></div></div>
        <div class="progress-caption"><span>0%</span><span>75% passing</span><span>100%</span></div>
      </section>
      <div class="stats-grid">
        <article class="stat-card"><p class="stat-label">Meetings here</p><p class="stat-value">${stats.present} <span style="color:#9aa69e;font-weight:500">/ ${stats.eligibleMeetings.length}</span></p></article>
        <article class="stat-card"><p class="stat-label">Attendance started</p><p class="stat-value">${escapeHtml(formatDate(stats.firstPresentDate))}</p></article>
      </div>
      <section aria-labelledby="history-heading">
        <div class="section-heading"><h2 id="history-heading">Meeting history</h2><span>Counted Mondays only</span></div>
        ${history ? `<ul class="history-list">${history}</ul>` : `<div class="empty-card">Your attendance starts the first time you are marked here at a counted Monday meeting.</div>`}
      </section>
      `;
    return;
  }

  if (members.length === 0) {
    root.innerHTML = '<div class="empty-card">There are no students on the roster yet.</div>';
    return;
  }

  const groups = EVENT_TYPES.map(([key, label]) => ({
    key,
    label,
    members: members.filter((member) => (member.eventType ?? "unassigned") === key),
  })).filter((group) => group.members.length > 0);

  root.innerHTML = `
    <div class="roster-groups">${groups.map((group) => `
      <section class="event-group" aria-label="${escapeHtml(group.label)}">
        <div class="event-heading"><span>${escapeHtml(group.label)}</span><span class="event-count">${group.members.length} ${group.members.length === 1 ? "student" : "students"}</span></div>
        <div class="student-list">${group.members.map((member) => `<button class="student-choice" type="button" data-action="select" data-member-id="${escapeHtml(member.id)}"><span>${escapeHtml(member.name)}</span><span class="choice-arrow" aria-hidden="true">›</span></button>`).join("")}</div>
      </section>`).join("")}</div>
    <p class="privacy-note">Attendance is visible to anyone with this link.</p>`;
}

export async function startStudentApp(root) {
  let data;
  let selectedMemberId = null;
  async function load() {
    showLoading(root);
    try {
      const response = await fetch(API_URL, { method: "GET", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load attendance.");
      data = payload;
      renderStudentApp(root, data, selectedMemberId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load attendance.";
      root.innerHTML = `<div class="error-card" role="alert"><p>${escapeHtml(message)} Please check your connection and try again.</p><button class="retry-button" type="button" data-action="retry">Try again</button></div>`;
    }
  }

  root.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "select") {
      selectedMemberId = button.dataset.memberId;
      renderStudentApp(root, data, selectedMemberId);
    } else if (button.dataset.action === "choose") {
      selectedMemberId = null;
      renderStudentApp(root, data, null);
    } else if (button.dataset.action === "retry") {
      void load();
    }
  });

  await load();
}

if (typeof document !== "undefined") {
  const root = document.querySelector("#app");
  if (root) void startStudentApp(root);
}
