import test from "node:test";
import assert from "node:assert/strict";

import { calculateAttendance, isCountedMonday, renderStudentApp } from "../student.mjs";

const member = { id: 4, name: "Jordan Student", eventType: "speech", eligibleFrom: "2026-09-01" };
const meetings = [
  { id: 1, meetingDate: "2026-09-07", countsTowardAttendance: true },
  { id: 2, meetingDate: "2026-09-14", countsTowardAttendance: false },
  { id: 3, meetingDate: "2026-09-21", countsTowardAttendance: true },
  { id: 4, meetingDate: "2026-09-28", countsTowardAttendance: true },
  { id: 5, meetingDate: "2026-09-29", countsTowardAttendance: true },
  { id: 6, meetingDate: "2026-10-05", countsTowardAttendance: true },
];

test("attendance starts at the first counted Monday marked Here", () => {
  const stats = calculateAttendance(member, meetings, [
    { meetingId: 1, memberId: 4, present: false },
    { meetingId: 3, memberId: 4, present: true },
    { meetingId: 4, memberId: 4, present: false },
    { meetingId: 6, memberId: 4, present: true },
  ], "2026-09-29");

  assert.equal(stats.firstPresentDate, "2026-09-21");
  assert.deepEqual(stats.eligibleMeetings.map((meeting) => meeting.id), [3, 4]);
  assert.equal(stats.present, 1);
  assert.equal(stats.percent, 50);
});

test("excluded meetings and non-Mondays never enter the denominator", () => {
  assert.equal(isCountedMonday(meetings[1]), false);
  assert.equal(isCountedMonday(meetings[4]), false);
  assert.equal(isCountedMonday(meetings[5]), true);
  const stats = calculateAttendance(member, meetings, [
    { meetingId: 1, memberId: 4, present: true },
    { meetingId: 2, memberId: 4, present: true },
    { meetingId: 3, memberId: 4, present: true },
    { meetingId: 4, memberId: 4, present: true },
    { meetingId: 6, memberId: 4, present: true },
  ], "2026-09-29");
  assert.equal(stats.firstPresentDate, "2026-09-07");
  assert.equal(stats.eligibleMeetings.length, 3);
  assert.equal(stats.percent, 100);
});

test("members with no counted Here record have not started", () => {
  const stats = calculateAttendance(member, meetings, [
    { meetingId: 1, memberId: 4, present: false },
    { meetingId: 6, memberId: 4, present: true },
  ], "2026-09-29");
  assert.equal(stats.firstPresentDate, null);
  assert.equal(stats.eligibleMeetings.length, 0);
  assert.equal(stats.percent, null);
});

test("exactly 75 percent passes once that Monday arrives", () => {
  const stats = calculateAttendance(member, meetings, [
    { meetingId: 1, memberId: 4, present: true },
    { meetingId: 3, memberId: 4, present: true },
    { meetingId: 4, memberId: 4, present: false },
    { meetingId: 6, memberId: 4, present: true },
  ], "2026-10-05");
  assert.equal(stats.eligibleMeetings.length, 4);
  assert.equal(stats.present, 3);
  assert.equal(stats.percent, 75);
});

test("student roster is concise, read-only, and escapes names", () => {
  const root = { innerHTML: "" };
  renderStudentApp(root, { members: [{ ...member, name: "<img src=x onerror=alert(1)>" }] });
  assert.doesNotMatch(root.innerHTML, /Check your attendance|Your club, your record|Choose your name/);
  assert.match(root.innerHTML, /Attendance is visible to anyone with this link/);
  assert.doesNotMatch(root.innerHTML, /add_member|admin|href=/i);
  assert.match(root.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
});
