# SnipeRank Frontend

This repo powers the frontend for SnipeRank, an AI SEO scoring tool developed by Quontora.

---

## 🔀 Branch Structure

| Branch               | Purpose                     |
|----------------------|-----------------------------|
| `main`               | 🔒 Production (live site)    |
| `sniperank-v2-dev`   | 🧪 Active development        |
| `sniperank-v2-dev-backup` | 🧯 Temporary backup (optional to delete)

---

## 🚀 Vercel Projects

| Project Name     | Purpose       | Connected Branch       | URL                        |
|------------------|----------------|-------------------------|----------------------------|
| `sniperank-live` | 🟢 Production | `main`                  | https://quontora.com       |
| `sniperank-dev`  | 🧪 Development | `sniperank-v2-dev`      | https://sniperank-v2.vercel.app |

> Only deploy to `main` after changes have been reviewed and tested in `sniperank-v2-dev`.

---

## ✅ How to Work Safely

1. Do all active work in `sniperank-v2-dev`
2. Push to GitHub — Vercel auto-deploys to https://sniperank-v2.vercel.app
3. When ready to go live:
   - Merge into `main`
   - Vercel will deploy to `sniperank-live` (live domain)
4. Never test or break things on `main`

---

## 🌐 Environment Variables (Vercel)

This project expects the following environment variables to be set in Vercel:

| Variable Name       | Purpose                          |
|---------------------|----------------------------------|
| `API_BASE_URL`      | URL used by the analysis fetch function |
| `SENDGRID_API_KEY`  | (Optional) for contact form/email sending |
| `SECRET_TOKEN`      | (Optional) if any auth token is used by backend |

> Set these in Vercel under:  
> **Project → Settings → Environment Variables**

## 🛠 Contact

Maintained by [Yoram Ezra](https://quontora.com)  
Questions or access issues? Ping directly.
