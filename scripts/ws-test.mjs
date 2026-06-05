import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:3100/ws');
let outputCount = 0;

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'workspace:list' }));
});

ws.on('message', (data) => {
  const m = JSON.parse(data.toString());

  if (m.type === 'workspace:list' && m.workspaces?.length) {
    const w = m.workspaces[0];
    console.log('workspace:', w.name, 'resources:', w.resources?.map((r) => `${r.name}(${r.type}/${r.status})`).join(', '));
    const r = w.resources?.find((x) => x.type === 'claude') || w.resources?.[0];
    if (!r) {
      console.log('no resources');
      ws.close();
      return;
    }
    ws.send(JSON.stringify({
      type: 'resource:subscribe',
      workspaceId: w.id,
      resourceId: r.id,
      cols: 120,
      rows: 30,
    }));
    return;
  }

  if (m.type === 'resource:status') {
    console.log('status:', m.status);
  }

  if (m.type === 'resource:snapshot') {
    const text = (m.snapshot?.ansiBuffer?.[0] || '').replace(/\x1b/g, '\\e').slice(0, 200);
    console.log('snapshot bytes:', (m.snapshot?.ansiBuffer?.[0] || '').length, 'preview:', text);
    outputCount++;
  }

  if (m.type === 'resource:output') {
    const text = (m.data || '').replace(/\x1b/g, '\\e').slice(0, 200);
    console.log('output bytes:', (m.data || '').length, 'preview:', text);
    outputCount++;
  }

  if (outputCount >= 3) {
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => {
  console.error('ws error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('timeout after 8s, outputs received:', outputCount);
  process.exit(outputCount > 0 ? 0 : 1);
}, 8000);
