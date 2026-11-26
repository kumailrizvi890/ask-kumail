---
title: Pulse Find
url: https://pulsefind-app.vercel.app
---

# Pulse Find (job application tracker with an MCP server)
Live app: https://pulsefind-app.vercel.app
Code: https://github.com/kumailrizvi890/Pulse-Find (open source, MIT license)

Pulse Find is the job application tracker Kumail runs his own internship search on. He built it because his spreadsheet kept letting things slip: an assessment about to expire, a recruiter waiting on a reply, a company that had gone quiet weeks ago. Kumail has tracked 285 of his own applications in it. It is a live product with a public demo that runs on invented sample data, and it is listed on Agensi, where it ranks first of 22 skills for "internship".

## What it does

The home screen is a waiting-on-you queue: every assessment, reply and unfinished application across the whole search, sorted soonest deadline first, with overdue items called out. Spreadsheets are good at storing applications and bad at saying what to do next, and the queue is the fix for that.

Ghost detection counts the days since each company last made contact. Past 21 days by default (the threshold is adjustable) an application is flagged Ghosted, and past half the threshold it is flagged Follow up soon. Closed applications are never flagged. The dashboard also shows a stage funnel (applied, assessment, interview, offer) and weekly application pace against a goal.

There is a leads pipeline for roles Kumail is still deciding on, a networking tracker for follow-ups he owes people, and a spreadsheet-style sheet view with the same sixteen columns as a classic application tracker. Applications can be imported from CSV or Excel files, including other people's column names and messy dates, and exported back out.

## The MCP server

Pulse Find has a built-in Model Context Protocol (MCP) server with 14 tools, so an AI assistant the user already has, such as Claude or Cursor, can keep the tracker up to date. Pulse Find itself never reads anyone's inbox and needs no AI API key. The agent reads the user's email with its own tools and reports structured results to Pulse Find.

The 14 tools are process_job_email, get_summary, list_applications, add_application, update_application, list_events, check_job_scam, search_jobs, list_leads, add_lead, update_lead, list_contacts, add_contact and update_contact. Agents connect with a personal access token. Only a SHA-256 fingerprint of each token is stored, and tokens can be revoked at any time. The MCP endpoint is rate limited to 60 requests per minute per token and 300 per minute per IP, with the counters kept in Postgres.

## The email engine

One email engine classifies each job email as a confirmation, an assessment invite, an interview invite, a reminder, a rejection or an offer, matches it to the right application, and sets what is waiting on the user with its deadline. Processing the same email twice changes nothing, because updates are idempotent by message id. An update can never move an application backward to an earlier stage, except rejections and offers, which count whenever they arrive. The same engine checks emails for job scam signs, such as check deposits, equipment reimbursement, interviews over chat apps, upfront fees and personal email domains. The engine is one dependency-free TypeScript module that runs in the Supabase edge function, in the web app, and in the test suite.

## Job board

Pulse Find has a live job board with 255 open roles from more than 50 companies. The postings are pulled straight from company Greenhouse, Lever and Ashby boards and refreshed every 6 hours by a scheduled job, so a role disappears from Pulse Find when it disappears from the company's own board. There are filters for internships, new grad roles, remote roles and tech roles, plus a swipe deck for browsing.

## Privacy and security

Every table in the Postgres database has row-level security policies scoped to the signed-in user's id, so the database itself refuses to hand one user another user's rows, no matter which client asks. The public demo runs entirely in the browser on invented sample data and never touches the real database. Dates are stored as calendar dates and handled as YYYY-MM-DD strings, so a deadline never shifts a day because of time zones.

## Tech stack

Next.js 16, React 19, TypeScript and Tailwind CSS on the front end. Supabase provides Postgres, authentication, row-level security, edge functions and pg_cron scheduled jobs. The test suite has 1,207 Vitest tests and runs in GitHub Actions CI on every push, alongside lint, typecheck and build. The app is deployed on Vercel and works as a progressive web app on phones.

## Status and honest numbers

Pulse Find is pre-revenue and solo. As of November 2026 the production database has 4 accounts, 2 of them with applications, and most tracked applications are Kumail's own. A day-before deadline reminder digest is built and scheduled, and the email provider setup is the last step before reminders send. Kumail's next phase is distribution through student clubs and career centers, with gates he set himself: 50 signups, then 100 weekly active users or one institution pilot, then 10 paying users or one paid pilot.
