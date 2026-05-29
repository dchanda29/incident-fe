# Incident Triage Console

Frontend console for the Incident Triage AI backend.

This is a focused operational UI for engineers to submit an incident question, choose a service and severity, then inspect the AI-generated triage report.

## What It Shows

- Incident question input
- Service and severity selectors
- Root cause summary
- Confidence score
- Impacted services
- Recommended remediation steps
- Evidence from logs, metrics, deployments, and runbooks

## Local Setup

Run the backend first:

```bash
uvicorn incident_triage_ai.main:app --reload --port 8000
```

Install frontend dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

In development, Vite proxies `/api/*` to the backend at `http://127.0.0.1:8000`.
It also proxies `/pseudo-api/*` to the pseudo business APIs at `http://127.0.0.1:8010`.

## Configure Backend URL

For production builds, set:

```bash
VITE_API_BASE_URL=https://your-backend.example.com
VITE_PSEUDO_API_BASE_URL=https://your-pseudo-apis.example.com
```

In Vercel, add these in **Project Settings -> Environment Variables**, then redeploy the latest deployment. If these are missing, the deployed app will try to call local development proxy paths like `/api`, which only work during `npm run dev`.

Then build:

```bash
npm run build
```

## Positioning

This UI is intentionally thin. The portfolio story should remain backend-led:

> AI-powered incident triage system that correlates logs, metrics, deployments, and runbooks to generate structured root cause reports for production incidents.
