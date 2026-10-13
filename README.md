# Blu's Game Plan

A one-page planner for Blu's Fall 2026 semester. It has five tabs:

- **Today:** the day's schedule, the next exam countdown, today's exam-prep focus, and what's due in the next 7 days
- **Week:** the normal-week and exam-week grids
- **Deadlines:** every deadline and exam through Dec 14
- **Classes:** targets for each class, plus the house rules
- **Exam prep:** a study method for each class and day-by-day steps for every exam

The page switches to the exam-week schedule automatically for the 7 days before each exam. Check-offs sync through Supabase, so Blu and Gabe see the same progress.

Everything is plain static files: `index.html`, `config.js`, and `supabase/setup.sql`. There is no build step.

## Deploy with Claude Code

Open this folder in Claude Code and paste:

> This folder is a static site with no build step. Use my personal accounts, not First Love's.
> 1. Create a private GitHub repo named `blu-game-plan` on my personal account and push this folder to it.
> 2. Create a Supabase project named `blu-game-plan` in my personal organization (free tier). Run `supabase/setup.sql` on it.
> 3. Put the project URL and the **anon public** key into `config.js`. Never use the service_role key. Commit and push.
> 4. Deploy the repo to Vercel on my personal account as a static site (framework: Other, no build command, output directory = root). Connect it to the GitHub repo so future pushes redeploy automatically.
> 5. Open the production URL and confirm that ticking a checkbox creates a row in the `checks` table.
> 6. Give me the production URL.

## Notes

- The site shows Blu's grades, so share the link only with Blu. The page tells search engines not to index it.
- Without Supabase keys in `config.js`, check-offs save on the device only.
- To change the schedule, deadlines, or exam plans, edit the data arrays at the top of the script in `index.html`: `NORMAL`, `EXAMWK`, `EXAMS`, `METHODS`, `DEADLINES`, and `CLASSES`.
