#!/usr/bin/env node

/**
 * 21st.dev Streamable HTTP MCP Client & Verification Tool
 * 
 * Usage:
 *   node scripts/21st_mcp.mjs [API_KEY]
 *   API_KEY_21ST="your-key" node scripts/21st_mcp.mjs
 */

const apiKey = process.argv[2] || process.env.API_KEY_21ST;
const MCP_ENDPOINT = 'https://21st.dev/api/mcp';

if (!apiKey) {
  console.log('\x1b[33m[Notice] No API key provided.\x1b[0m');
  console.log('To verify with your 21st.dev account, run:');
  console.log('  node scripts/21st_mcp.mjs <your-21st-api-key>');
  console.log('  export API_KEY_21ST="<your-key>" && node scripts/21st_mcp.mjs\n');
  console.log('Get a key from: https://21st.dev/mcp\n');
}

async function postRpc(payload, sessionId = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const respSessionId = response.headers.get('mcp-session-id') || sessionId;
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
  }

  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    const lines = text.split('\n');
    let data = '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        data += line.replace(/^data:\s*/, '');
      }
    }
    return { data: JSON.parse(data), sessionId: respSessionId };
  } else {
    const data = await response.json();
    return { data, sessionId: respSessionId };
  }
}

async function verify() {
  console.log('\x1b[36mConnecting to 21st.dev MCP endpoint:\x1b[0m', MCP_ENDPOINT);
  console.log('API Key:', apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : '(none)');
  console.log();

  console.log('\x1b[34m[1/3] Initializing connection (initialize)...\x1b[0m');
  const initRes = await postRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'antigravity-mcp-client', version: '1.0.0' }
    }
  });

  const serverInfo = initRes.data.result?.serverInfo || initRes.data.result;
  console.log('Server info:', serverInfo);
  const sessionId = initRes.sessionId;
  if (sessionId) {
    console.log('Session ID:', sessionId);
  }

  console.log('\x1b[34m[2/3] Sending initialized notification...\x1b[0m');
  try {
    await postRpc({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }, sessionId);
    console.log('Handshake completed.');
  } catch (err) {
    console.log('Notification sent.');
  }

  console.log('\x1b[34m[3/3] Listing tools (tools/list)...\x1b[0m');
  const toolsRes = await postRpc({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  }, sessionId);

  const tools = toolsRes.data.result?.tools || [];
  console.log(`\n\x1b[32m✔ Successfully connected! Discovered ${tools.length} tool(s):\x1b[0m\n`);

  for (const [idx, tool] of tools.entries()) {
    console.log(`\x1b[1m${idx + 1}. ${tool.name}\x1b[0m`);
    console.log(`   Description: ${tool.description || 'N/A'}`);
    if (tool.inputSchema?.properties) {
      console.log(`   Inputs: ${Object.keys(tool.inputSchema.properties).join(', ')}`);
    }
    console.log();
  }
}

verify().catch(err => {
  console.error('\n\x1b[31m✖ Connection failed:\x1b[0m', err.message);
  process.exit(1);
});
