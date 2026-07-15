// CRM API Server — exposes cadence/lead functions as HTTP endpoints.
// Entry point for the deployed dashboard.

import express from 'express';
import cors from 'cors';
import path from 'path';

// Cadence module
import { views as cadenceViews } from './cadence';
import { leads } from './lead';
import { leadList } from './lead/views';

const app = express();
app.use(cors());
app.use(express.json());

// Serve dashboard static files
app.use(express.static(path.join(__dirname, 'public')));

// ── Health ──────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Dashboard Stats ─────────────────────────────────────

app.get('/api/stats', async (_req, res) => {
  try {
    const stats = await cadenceViews.cadenceList.getCadenceDailyStats();
    res.json(stats);
  } catch (err: any) {
    console.error('GET /api/stats error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch stats' });
  }
});

// ── Overdue Tasks ───────────────────────────────────────

app.get('/api/tasks/overdue', async (_req, res) => {
  try {
    const result = await cadenceViews.taskQueue.getOverdueQueue();
    res.json(result);
  } catch (err: any) {
    console.error('GET /api/tasks/overdue error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch overdue tasks' });
  }
});

// ── Due Today Tasks ─────────────────────────────────────

app.get('/api/tasks/due-today', async (_req, res) => {
  try {
    const { overdue } = await import('./cadence');
    const items = await overdue.listDueToday();
    res.json({ items, total: items.length });
  } catch (err: any) {
    console.error('GET /api/tasks/due-today error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch due-today tasks' });
  }
});

// ── Cadences ────────────────────────────────────────────

app.get('/api/cadences', async (req, res) => {
  try {
    const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
    const result = await cadenceViews.cadenceList.listCadencesView(isActive);
    res.json(result);
  } catch (err: any) {
    console.error('GET /api/cadences error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch cadences' });
  }
});

// ── Leads ───────────────────────────────────────────────

app.get('/api/leads', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const result = await leads.listLeads({ status: status as any, search });
    res.json(result);
  } catch (err: any) {
    console.error('GET /api/leads error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch leads' });
  }
});

app.get('/api/leads/pipeline', async (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const result = await leadList.getLeadPipeline(ownerId);
    res.json(result);
  } catch (err: any) {
    console.error('GET /api/leads/pipeline error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch pipeline' });
  }
});

// ── Task Actions ────────────────────────────────────────

app.post('/api/tasks/:id/complete', async (req, res) => {
  try {
    const result = await cadenceViews.taskQueue.completeTask(req.params.id, req.body?.nextAssigneeId);
    res.json(result);
  } catch (err: any) {
    console.error('POST /api/tasks/:id/complete error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to complete task' });
  }
});

app.post('/api/tasks/:id/skip', async (req, res) => {
  try {
    const result = await cadenceViews.taskQueue.skipTask(req.params.id);
    res.json(result);
  } catch (err: any) {
    console.error('POST /api/tasks/:id/skip error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to skip task' });
  }
});

// ── Fallback: serve dashboard for any unmatched route ───

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ───────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000', 10);
app.listen(PORT, () => {
  console.log(`CRM dashboard running on http://localhost:${PORT}`);
});

export default app;
