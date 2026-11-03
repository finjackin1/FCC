// Live test (01/11): with agentProgressSummaries, a real subagent sends one-line status (task_progress.summary). Costs a little quota (haiku).
const path = require('path'), os = require('os');
(async () => {
  const S = await import('@anthropic-ai/claude-agent-sdk');
  const env = { ...process.env }; for (const k of Object.keys(env)) if (/^CLAUDE_CODE_|^CLAUDECODE$/.test(k)) delete env[k];
  const q = S.query({ prompt: 'Use the Agent tool (general-purpose, model haiku) to read every .js file in this folder and in tela, one at a time, and report what each does in a long paragraph; take your time. Then say done.',
    options: { cwd: path.join(__dirname, '..'), env, model: 'haiku', effort: 'low', permissionMode: 'default', allowedTools: ['Agent', 'Read', 'Grep', 'Glob'], disallowedTools: ['Bash', 'PowerShell', 'Edit', 'Write', 'WebFetch', 'WebSearch'], settingSources: [], strictMcpConfig: true, agentProgressSummaries: true,
      pathToClaudeCodeExecutable: path.join(os.homedir(), '.local', 'bin', 'claude.exe'), maxTurns: 5 } });
  let n = 0, res = 0;
  for await (const m of q) {
    if (m.type === 'system' && m.subtype === 'task_progress') { n++; if (m.summary) { res++; console.log('resumo:', String(m.summary).slice(0, 120)); } else console.log('progresso:', m.last_tool_name, (m.usage || {}).tool_uses); }
    if (m.type === 'result') console.log('fim:', m.subtype, 'usd', m.total_cost_usd);
  }
  console.log(`avisos de progresso ${n}, com resumo ${res}`); process.exit(0);
})().catch(e => { console.log('ERRO', e.message); process.exit(1); });
