// server.js - DevTaskFlow 看板后端
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const WORKSPACE = process.env.DTFLOW_WORKSPACE || process.cwd();
const PORT = process.env.DTFLOW_BOARD_PORT || 8765;

function loadProjects() {
  const projFile = path.join(WORKSPACE, 'PROJECTS.json');
  if (!fs.existsSync(projFile)) return [];
  return JSON.parse(fs.readFileSync(projFile, 'utf8'));
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return null; }
}

function readFirstN(filePath, n) {
  if (!fs.existsSync(filePath)) return '';
  const data = fs.readFileSync(filePath, 'utf8');
  return data.slice(0, n);
}

app.get('/api/projects', (req, res) => {
  const projects = loadProjects();
  const result = projects.map(p => {
    const projPath = p.path;
    const configPath = path.join(projPath, '.dtflow', 'config.json');
    const config = readJSON(configPath) || {};
    const versionDir = path.join(projPath, 'versions', p.current_version || '');
    const state = readJSON(path.join(versionDir, '.state.json')) || {};
    const reqPath = path.join(versionDir, 'docs', 'REQUIREMENTS.md');
    const reqSummary = readFirstN(reqPath, 200);
    return {
      name: p.name,
      status: p.status,
      current_version: p.current_version,
      updated_at: p.updated_at,
      note: p.note,
      version_state: state,
      deploy: config.deploy || {},
      requirements_summary: reqSummary,
    };
  });
  res.json(result);
});

app.get('/api/projects/:name', (req, res) => {
  const name = req.params.name;
  const projects = loadProjects();
  const p = projects.find(pr => pr.name === name);
  if (!p) return res.status(404).json({error: '项目未找到'});
  const projPath = p.path;
  const configPath = path.join(projPath, '.dtflow', 'config.json');
  const config = readJSON(configPath) || {};
  const versionDir = path.join(projPath, 'versions', p.current_version || '');
  const state = readJSON(path.join(versionDir, '.state.json')) || {};
  const tasks = state.tasks || [];
  const lastError = state.last_error || null;
  const reqPath = path.join(versionDir, 'docs', 'REQUIREMENTS.md');
  const reqFull = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf8') : '';
  res.json({
    ...p,
    deploy: config.deploy || {},
    version_state: state,
    tasks,
    last_error: lastError,
    requirements: reqFull,
  });
});

app.get('/api/health', (req, res) => {
  res.json({status: 'ok', time: new Date().toISOString()});
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DevTaskFlow board listening on port ${PORT}`);
});
