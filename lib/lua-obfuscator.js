const HEX = '0123456789abcdef';

function isIdentStart(ch) {
  return /[A-Za-z_]/.test(ch);
}

function isIdentChar(ch) {
  return /[A-Za-z0-9_]/.test(ch);
}

function readLongBracket(source, index) {
  if (source[index] !== '[') return null;
  let i = index + 1;
  let equals = 0;
  while (source[i] === '=') {
    equals += 1;
    i += 1;
  }
  if (source[i] !== '[') return null;
  const close = `]${'='.repeat(equals)}]`;
  const end = source.indexOf(close, i + 1);
  if (end === -1) return null;
  return { end: end + close.length, value: source.slice(index, end + close.length) };
}

function readQuoted(source, index) {
  const quote = source[index];
  let i = index + 1;
  let out = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      if (i + 1 >= source.length) {
        return { end: source.length, value: out + '\\' };
      }
      out += ch + source[i + 1];
      i += 2;
      continue;
    }
    if (ch === quote) {
      return { end: i + 1, value: out };
    }
    out += ch;
    i += 1;
  }
  return { end: source.length, value: out };
}

function tokenize(source) {
  const tokens = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (/\s/.test(ch)) {
      const start = i;
      while (i < source.length && /\s/.test(source[i])) i += 1;
      tokens.push({ kind: 'space', value: source.slice(start, i) });
      continue;
    }

    if (ch === '-' && source[i + 1] === '-') {
      const lb = readLongBracket(source, i + 2);
      if (lb) {
        tokens.push({ kind: 'comment', value: source.slice(i, lb.end) });
        i = lb.end;
        continue;
      }
      const start = i;
      i += 2;
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i += 1;
      tokens.push({ kind: 'comment', value: source.slice(start, i) });
      continue;
    }

    if (ch === '"' || ch === "'") {
      const parsed = readQuoted(source, i);
      tokens.push({ kind: 'string', value: parsed.value, quote: ch });
      i = parsed.end;
      continue;
    }

    if (ch === '[') {
      const lb = readLongBracket(source, i);
      if (lb) {
        tokens.push({ kind: 'long', value: lb.value });
        i = lb.end;
        continue;
      }
    }

    if (isIdentStart(ch)) {
      const start = i;
      i += 1;
      while (i < source.length && isIdentChar(source[i])) i += 1;
      tokens.push({ kind: 'code', value: source.slice(start, i) });
      continue;
    }

    const multi = source.slice(i, i + 3);
    if (multi === '...') {
      tokens.push({ kind: 'code', value: multi });
      i += 3;
      continue;
    }
    const duo = source.slice(i, i + 2);
    if (['==', '~=', '<=', '>=', '..', '::', '+=', '-=', '*=', '/='].includes(duo)) {
      tokens.push({ kind: 'code', value: duo });
      i += 2;
      continue;
    }

    tokens.push({ kind: 'code', value: ch });
    i += 1;
  }

  return tokens;
}

function luaStringToBytes(raw) {
  const bytes = [];
  for (let i = 0; i < raw.length;) {
    const ch = raw[i];
    if (ch !== '\\') {
      const code = raw.charCodeAt(i);
      if (code > 255) return null;
      bytes.push(code);
      i += 1;
      continue;
    }
    if (i + 1 >= raw.length) return null;
    const next = raw[i + 1];
    const simple = {
      a: 7, b: 8, f: 12, n: 10, r: 13, t: 9, v: 11,
      '\\': 92, '"': 34, "'": 39,
    };
    if (next in simple) {
      bytes.push(simple[next]);
      i += 2;
      continue;
    }
    if (next === 'z') {
      i += 2;
      continue;
    }
    if (/[0-9]/.test(next)) {
      let digits = next;
      i += 2;
      while (digits.length < 3 && i < raw.length && /[0-9]/.test(raw[i])) {
        digits += raw[i++];
      }
      const n = Number(digits);
      if (n > 255) return null;
      bytes.push(n);
      continue;
    }
    if (next === 'x' && /^[0-9a-fA-F]{2}$/.test(raw.slice(i + 2, i + 4))) {
      bytes.push(parseInt(raw.slice(i + 2, i + 4), 16));
      i += 4;
      continue;
    }
    if (next === '\n') {
      bytes.push(10);
      i += 2;
      continue;
    }
    if (next === '\r') {
      bytes.push(13);
      i += 2;
      if (raw[i] === '\n') {
        bytes.push(10);
        i += 1;
      }
      continue;
    }
    return null;
  }
  return bytes;
}

function hex(bytes) {
  let out = '';
  for (const n of bytes) out += HEX[(n >> 4) & 15] + HEX[n & 15];
  return out;
}

function safeDecodeName(level) {
  return level === 'strong' ? '_0x' + Math.random().toString(36).slice(2, 8) : '_decodeLua';
}

function makeDecoder(name) {
  return `local function ${name}(h)local s="" for i=1,#h,2 do s=s..string.char(tonumber(h:sub(i,i+1),16)) end return s end `;
}

function minifyTokens(tokens, keepComments) {
  let out = '';
  let previous = '';
  for (const token of tokens) {
    if (token.kind === 'space') continue;
    if (token.kind === 'comment') {
      if (keepComments) {
        out += token.value.startsWith('--[') ? token.value : `${token.value}\n`;
        previous = '';
      }
      continue;
    }
    const current = token.value;
    if (previous && isIdentChar(previous[previous.length - 1] || '') && isIdentStart(current[0] || '')) {
      out += ' ';
    }
    out += current;
    previous = current;
  }
  return out;
}

function normalJoin(tokens) {
  return tokens.map((token) => token.value).join('');
}

export function protectLua(source, options) {
  const input = source.replace(/^\uFEFF/, '');
  if (!input.trim()) throw new Error('Lua source is empty.');
  if (input.length > 2_000_000) throw new Error('Source exceeds the 2 MB safety limit.');

  const tokens = tokenize(input);
  const filtered = options.removeComments ? tokens.filter((t) => t.kind !== 'comment') : tokens;
  const decodeName = safeDecodeName(options.level);
  let needsDecoder = false;
  const transformed = filtered.map((token) => {
    if (token.kind !== 'string' || !options.encodeStrings) return token;
    const bytes = luaStringToBytes(token.value);
    if (!bytes || bytes.length === 0) return token;
    needsDecoder = true;
    return { kind: 'code', value: `${decodeName}("${hex(bytes)}")` };
  });

  if (options.level === 'strong') {
    // Split long runs of hexadecimal decoder data to avoid one obvious constant.
    for (let i = 0; i < transformed.length; i += 1) {
      const token = transformed[i];
      if (token.kind === 'code' && token.value.startsWith(`${decodeName}("`)) {
        token.value = token.value.replace(/^(.*\(")([0-9a-f]+)("\))$/, (_, a, h, c) => {
          const parts = h.match(/.{1,32}/g) || [h];
          return `${a}${parts.join('".."')}${c}`;
        });
      }
    }
  }

  const body = options.minify ? minifyTokens(transformed, !options.removeComments) : normalJoin(transformed);
  const decoder = needsDecoder ? makeDecoder(decodeName) : '';
  const stamp = `-- MawwwHub LuaProtect • ${options.level} • client-side transform\n`;
  return stamp + decoder + body;
}
