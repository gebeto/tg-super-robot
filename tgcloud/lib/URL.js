const DEFAULT_PORTS = { 'http:': '80', 'https:': '443', 'ftp:': '21', 'ws:': '80', 'wss:': '443' };

function encodeComponent(str, extra) {
  return String(str).replace(new RegExp('[^\\x21-\\x7e]|[' + extra + ']', 'g'), (c) => encodeURIComponent(c));
}

function normalizePath(path) {
  const out = [];
  const segs = path.split('/');
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const last = i === segs.length - 1;
    if (s === '..') {
      if (out.length > 1) out.pop();
      if (last) out.push('');
    } else if (s === '.') {
      if (last) out.push('');
    } else {
      out.push(s);
    }
  }
  return out.join('/') || '/';
}

export class URLSearchParams {
  constructor(init = '', onChange) {
    this._list = [];
    this._onChange = onChange;
    if (typeof init === 'string') {
      this._parse(init);
    } else if (init instanceof URLSearchParams) {
      this._list = init._list.map((p) => [p[0], p[1]]);
    } else if (Array.isArray(init)) {
      for (const [k, v] of init) this._list.push([String(k), String(v)]);
    } else if (init && typeof init === 'object') {
      for (const k of Object.keys(init)) this._list.push([k, String(init[k])]);
    }
  }

  _parse(str) {
    this._list = [];
    if (str[0] === '?') str = str.slice(1);
    for (const part of str.split('&')) {
      if (!part) continue;
      const i = part.indexOf('=');
      const k = i < 0 ? part : part.slice(0, i);
      const v = i < 0 ? '' : part.slice(i + 1);
      this._list.push([decode(k), decode(v)]);
    }
  }

  _changed() {
    if (this._onChange) this._onChange(this.toString());
  }

  append(k, v) { this._list.push([String(k), String(v)]); this._changed(); }
  delete(k) { this._list = this._list.filter((p) => p[0] !== k); this._changed(); }
  get(k) { const p = this._list.find((p) => p[0] === k); return p ? p[1] : null; }
  getAll(k) { return this._list.filter((p) => p[0] === k).map((p) => p[1]); }
  has(k) { return this._list.some((p) => p[0] === k); }
  set(k, v) {
    k = String(k); v = String(v);
    const i = this._list.findIndex((p) => p[0] === k);
    if (i < 0) {
      this._list.push([k, v]);
    } else {
      this._list[i][1] = v;
      this._list = this._list.filter((p, j) => j <= i || p[0] !== k);
    }
    this._changed();
  }
  sort() { this._list.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)); this._changed(); }
  forEach(cb, thisArg) { for (const [k, v] of this._list) cb.call(thisArg, v, k, this); }
  *entries() { for (const p of this._list) yield [p[0], p[1]]; }
  *keys() { for (const p of this._list) yield p[0]; }
  *values() { for (const p of this._list) yield p[1]; }
  [Symbol.iterator]() { return this.entries(); }
  get size() { return this._list.length; }
  toString() {
    const enc = (s) => encodeURIComponent(s).replace(/%20/g, '+').replace(/[!'()~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    return this._list.map(([k, v]) => enc(k) + '=' + enc(v)).join('&');
  }
}

function decode(s) {
  s = s.replace(/\+/g, ' ');
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

const URL_RE = /^([a-zA-Z][a-zA-Z0-9+.-]*:)(?:\/\/(?:([^/?#@]*)@)?(\[[^\]]*\]|[^/?#:]*)(?::(\d*))?)?([^?#]*)(\?[^#]*)?(#.*)?$/;

export class URL {
  constructor(url, base) {
    url = String(url).trim();
    let m = URL_RE.exec(url);
    if (!m) {
      if (base === undefined) throw new TypeError('Invalid URL: ' + url);
      const b = base instanceof URL ? base : new URL(base);
      url = URL._resolve(url, b);
      m = URL_RE.exec(url);
      if (!m) throw new TypeError('Invalid URL: ' + url);
    }
    const [, protocol, userinfo, host, port, path, search, hash] = m;
    const hasAuthority = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url);
    if (hasAuthority && !host && protocol !== 'file:') throw new TypeError('Invalid URL: ' + url);

    this._protocol = protocol.toLowerCase();
    this._hasAuthority = hasAuthority;
    const ui = userinfo ? userinfo.split(':') : [''];
    this._username = ui[0];
    this._password = ui.slice(1).join(':');
    this._hostname = (host || '').toLowerCase();
    this._port = port && port !== DEFAULT_PORTS[this._protocol] ? port : '';
    this._pathname = hasAuthority ? normalizePath(path || '/') : path;
    this._search = '';
    this._hash = '';
    this._params = new URLSearchParams('', (s) => { this._search = s ? '?' + s : ''; });
    this.search = search || '';
    this.hash = hash || '';
  }

  static _resolve(rel, base) {
    const origin = base._protocol + '//' + base.host;
    if (rel.startsWith('//')) return base._protocol + rel;
    if (rel.startsWith('/')) return origin + rel;
    if (rel.startsWith('?')) return origin + base._pathname + rel;
    if (rel.startsWith('#')) return origin + base._pathname + base._search + rel;
    if (rel === '') return base.href;
    return origin + base._pathname.replace(/[^/]*$/, '') + rel;
  }

  static canParse(url, base) {
    try { new URL(url, base); return true; } catch (e) { return false; }
  }

  get protocol() { return this._protocol; }
  set protocol(v) { v = String(v); this._protocol = (v.endsWith(':') ? v : v + ':').toLowerCase(); }

  get username() { return this._username; }
  set username(v) { this._username = String(v); }
  get password() { return this._password; }
  set password(v) { this._password = String(v); }

  get hostname() { return this._hostname; }
  set hostname(v) { this._hostname = String(v).toLowerCase(); }

  get port() { return this._port; }
  set port(v) {
    v = String(v);
    this._port = v === DEFAULT_PORTS[this._protocol] ? '' : v;
  }

  get host() { return this._hostname + (this._port ? ':' + this._port : ''); }
  set host(v) {
    const m = /^(\[[^\]]*\]|[^:]*)(?::(\d*))?$/.exec(String(v));
    if (!m) return;
    this._hostname = m[1].toLowerCase();
    if (m[2] !== undefined) this.port = m[2];
  }

  get origin() {
    return this._hasAuthority && this._protocol !== 'file:' ? this._protocol + '//' + this.host : 'null';
  }

  get pathname() { return this._pathname; }
  set pathname(v) {
    v = encodeComponent(v, ' "<>`#?{}');
    this._pathname = this._hasAuthority && v[0] !== '/' ? '/' + v : v;
  }

  get search() { return this._search.length > 1 ? this._search : ''; }
  set search(v) {
    v = String(v);
    if (v[0] === '?') v = v.slice(1);
    this._search = v ? '?' + encodeComponent(v, ' "<>#') : '';
    this._params._parse(v);
  }

  get searchParams() { return this._params; }

  get hash() { return this._hash.length > 1 ? this._hash : ''; }
  set hash(v) {
    v = String(v);
    if (v[0] === '#') v = v.slice(1);
    this._hash = v ? '#' + encodeComponent(v, ' "<>`') : '';
  }

  get href() {
    let auth = '';
    if (this._username || this._password) {
      auth = this._username + (this._password ? ':' + this._password : '') + '@';
    }
    const head = this._hasAuthority ? this._protocol + '//' + auth + this.host : this._protocol;
    return head + this._pathname + this.search + this.hash;
  }
  set href(v) {
    const u = new URL(v);
    Object.assign(this, u);
    this._params._onChange = (s) => { this._search = s ? '?' + s : ''; };
  }

  toString() { return this.href; }
  toJSON() { return this.href; }
}
