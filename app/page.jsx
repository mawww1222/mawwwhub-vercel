'use client';

import { useMemo, useRef, useState } from 'react';
import { protectLua } from '../lib/lua-obfuscator';

const sample = `-- Example Lua\nlocal message = "Hello from MawwwHub"\nprint(message)\n`;

export default function HomePage() {
  const [source, setSource] = useState('');
  const [output, setOutput] = useState('');
  const [fileName, setFileName] = useState('');
  const [level, setLevel] = useState('standard');
  const [removeComments, setRemoveComments] = useState(true);
  const [encodeStrings, setEncodeStrings] = useState(true);
  const [minify, setMinify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const inputBytes = new Blob([source]).size;
    const outputBytes = new Blob([output]).size;
    const saved = inputBytes > 0 && outputBytes > 0 ? Math.max(0, Math.round((1 - outputBytes / inputBytes) * 100)) : 0;
    return { inputBytes, outputBytes, saved };
  }, [source, output]);

  function loadFile(file) {
    const extension = file.name.toLowerCase();
    if (!extension.endsWith('.lua') && !extension.endsWith('.txt')) {
      setStatus('Please select a .lua or .txt file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setStatus('File is too large. Maximum size is 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setSource(text);
      setOutput('');
      setFileName(file.name);
      setStatus(`Loaded ${file.name}`);
    };
    reader.onerror = () => setStatus('Could not read the file.');
    reader.readAsText(file);
  }

  function onUpload(event) {
    const file = event.target.files?.[0];
    if (file) loadFile(file);
    event.target.value = '';
  }

  function onDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  function runProtect() {
    if (!source.trim()) {
      setStatus('Paste Lua source or upload a file first.');
      return;
    }
    setBusy(true);
    setStatus('Protecting…');
    setTimeout(() => {
      try {
        const protectedCode = protectLua(source, {
          removeComments,
          encodeStrings,
          minify,
          level,
        });
        setOutput(protectedCode);
        setStatus(`Done • ${protectedCode.length.toLocaleString()} characters`);
      } catch (error) {
        setOutput('');
        setStatus(error instanceof Error ? error.message : 'Protection failed.');
      } finally {
        setBusy(false);
      }
    }, 20);
  }

  function downloadOutput() {
    if (!output) {
      setStatus('Run Protect first.');
      return;
    }
    const base = (fileName || 'mawww-script.lua').replace(/\.(lua|txt)$/i, '');
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}.protected.lua`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${base}.protected.lua`);
  }

  function copyOutput() {
    if (!output) return;
    navigator.clipboard?.writeText(output).then(
      () => setStatus('Protected code copied.'),
      () => setStatus('Copy failed; use Download instead.')
    );
  }

  function useSample() {
    setSource(sample);
    setOutput('');
    setFileName('example.lua');
    setStatus('Sample loaded.');
  }

  return (
    <main className="shell">
      <div className="glow glowA" />
      <div className="glow glowB" />

      <header className="topbar">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <div className="brandTitle">MawwwHub LuaProtect</div>
            <div className="brandSub">Vercel-ready • browser-side protection</div>
          </div>
        </div>
        <a className="githubBtn" href="https://vercel.com/new" target="_blank" rel="noreferrer">Deploy</a>
      </header>

      <section className="hero">
        <div className="pill">FREE STARTER</div>
        <h1>Protect your Lua source without leaving the browser.</h1>
        <p>Upload or paste a script, choose a protection level, then download the transformed file. The default build does not send your Lua source to a backend.</p>
      </section>

      <section className="workspace">
        <div className="panel inputPanel">
          <div className="panelHead">
            <div>
              <h2>Source</h2>
              <span>{fileName || 'Paste Lua or upload a file'}</span>
            </div>
            <button className="ghost" onClick={useSample}>Load sample</button>
          </div>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input ref={inputRef} type="file" accept=".lua,.txt,text/plain" hidden onChange={onUpload} />
            <button className="upload" onClick={() => inputRef.current?.click()}>
              Upload .lua / .txt
            </button>
            <span>or drag & drop here</span>
          </div>
          <textarea
            value={source}
            onChange={(e) => { setSource(e.target.value); setOutput(''); }}
            spellCheck={false}
            placeholder="-- paste your Lua source here"
            aria-label="Lua source input"
          />
        </div>

        <aside className="panel settingsPanel">
          <div className="panelHead">
            <div>
              <h2>Protection</h2>
              <span>Balanced defaults</span>
            </div>
          </div>

          <label className="fieldLabel">Level</label>
          <div className="levelGrid">
            {['basic', 'standard', 'strong'].map((item) => (
              <button
                key={item}
                className={level === item ? 'level active' : 'level'}
                onClick={() => setLevel(item)}
              >
                <strong>{item[0].toUpperCase() + item.slice(1)}</strong>
                <small>{item === 'basic' ? 'cleanup' : item === 'standard' ? 'recommended' : 'more transforms'}</small>
              </button>
            ))}
          </div>

          <div className="checks">
            <Toggle label="Remove comments" checked={removeComments} onChange={setRemoveComments} />
            <Toggle label="Encode quoted strings" checked={encodeStrings} onChange={setEncodeStrings} />
            <Toggle label="Minify whitespace" checked={minify} onChange={setMinify} />
          </div>

          <div className="warning">
            <strong>Compatibility note</strong>
            <span>This is source transformation, not a VM or anti-analysis guarantee. Test protected output before publishing.</span>
          </div>

          <button className="protectBtn" onClick={runProtect} disabled={busy}>
            {busy ? 'Protecting…' : 'Protect Lua'}
          </button>

          <div className="status"><span className="dot" />{status}</div>
        </aside>

        <div className="panel outputPanel">
          <div className="panelHead">
            <div>
              <h2>Protected output</h2>
              <span>{stats.outputBytes ? `${stats.outputBytes.toLocaleString()} bytes` : 'No result yet'}</span>
            </div>
            <div className="actions">
              <button className="ghost" onClick={copyOutput} disabled={!output}>Copy</button>
              <button className="download" onClick={downloadOutput} disabled={!output}>Download</button>
            </div>
          </div>
          <textarea value={output} readOnly spellCheck={false} placeholder="Your transformed Lua will appear here…" aria-label="Protected Lua output" />
        </div>
      </section>

      <footer>
        <div><strong>{stats.inputBytes.toLocaleString()}</strong> input bytes</div>
        <div><strong>{stats.outputBytes.toLocaleString()}</strong> output bytes</div>
        <div><strong>{stats.saved}%</strong> size change</div>
        <div className="footerNote">MawwwHub LuaProtect • Vercel / Next.js</div>
      </footer>
    </main>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button className="toggleRow" onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span>{label}</span>
      <span className={checked ? 'switch on' : 'switch'}><span /></span>
    </button>
  );
}
