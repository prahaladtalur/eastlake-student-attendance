# Eastlake Student Attendance

Read-only student attendance page for Eastlake Speech & Debate. Students choose a name to see the saved attendance percentage and counted Monday history. The percentage uses the same rule as the admin app: attendance starts at the first counted Monday where the student is marked Here, and only counted Mondays from that date onward are included.

This static page reads from the existing attendance API and contains no attendance-writing requests or admin interface. It is a name picker without sign-in: anyone who can open the site can choose a student and see the roster's attendance. The URL and separate GitHub repository do not provide access control. The API itself remains public and writable; protecting attendance changes requires server-side authentication, which this project does not add.

## Hosting

This repository is the source for a Cloudflare Pages Direct Upload site. Upload `index.html`, `styles.css`, and `student.mjs` from the repository root to the Pages project. GitHub Pages is not enabled for this student site. Direct Upload is not connected to GitHub, so repeat the upload after changing the site files.

## Local checks

Run the attendance calculation tests with `npm test`. The page uses only static HTML, CSS, and JavaScript and reads from the shared API at `https://eastlake-speech-debate-attendance.dtalur.chatgpt.site/api/attendance`.
