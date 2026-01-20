(function(){
  const qs = (sel) => document.querySelector(sel);
  const inputEl = qs('#base64Input');
  const msgEl = qs('#message');
  const resultEl = qs('#result');
  const tableBody = qs('#table tbody');
  const countsEl = qs('#counts');
  const endSel = qs('#endianness');
  const precisionEl = qs('#precision');
  const decodeBtn = qs('#decodeBtn');
  const clearBtn = qs('#clearBtn');
  const sampleBtn = qs('#sampleBtn');

  function showError(text){
    msgEl.textContent = text || '';
    msgEl.hidden = !text;
  }
  function showResult(visible){
    resultEl.hidden = !visible;
  }

  function normalizeBase64(s){
    if (!s) return '';
    s = s.trim();
    // Handle data URL prefix
    const idx = s.indexOf('base64,');
    if (idx >= 0) s = s.slice(idx + 7);
    // Remove whitespace
    s = s.replace(/[\r\n\t\f\v\s]+/g, '');
    // URL-safe variants
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to length multiple of 4
    const pad = s.length % 4;
    if (pad === 2) s += '==';
    else if (pad === 3) s += '=';
    else if (pad === 1) throw new Error('Base64 長さが不正です');
    return s;
  }

  function base64ToBytes(b64){
    const normalized = normalizeBase64(b64);
    let binStr;
    try {
      binStr = atob(normalized);
    } catch(e){
      throw new Error('Base64 のデコードに失敗しました: ' + e.message);
    }
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    return bytes;
  }

  function bytesToFloat32Array(bytes, littleEndian){
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = Math.floor(bytes.byteLength / 4);
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) arr[i] = dv.getFloat32(i * 4, littleEndian);
    return arr;
  }

  function formatFloat(value, digits){
    if (!Number.isFinite(value)) return String(value);
    const d = Math.max(1, Math.min(15, digits|0));
    // Use toPrecision for consistent significant digits; fallback to toString
    try {
      return Number(value).toPrecision(d);
    } catch { return String(value); }
  }

  function renderArray(arr, digits){
    tableBody.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < arr.length; i++){
      const tr = document.createElement('tr');
      const tdIdx = document.createElement('td');
      tdIdx.style.textAlign = 'left';
      tdIdx.textContent = String(i);
      const tdVal = document.createElement('td');
      tdVal.textContent = formatFloat(arr[i], digits);
      tr.appendChild(tdIdx);
      tr.appendChild(tdVal);
      frag.appendChild(tr);
    }
    tableBody.appendChild(frag);
    countsEl.textContent = `要素数: ${arr.length}`;
  }

  function onDecode(){
    showError('');
    showResult(false);
    const raw = inputEl.value;
    if (!raw || !raw.trim()){
      showError('Base64 文字列を入力してください');
      return;
    }
    const little = endSel.value === 'little';
    let bytes;
    try {
      bytes = base64ToBytes(raw);
    } catch(e){
      showError(e.message);
      return;
    }
    if (bytes.length < 4){
      showError('データ長が 4 バイト未満のため Float32 に変換できません');
      return;
    }
    const remainder = bytes.length % 4;
    if (remainder !== 0){
      // Proceed but warn
      showError(`注意: データ長 (${bytes.length} バイト) は 4 の倍数ではありません。末尾 ${remainder} バイトは無視します。`);
    }
    const floats = bytesToFloat32Array(bytes, little);
    renderArray(floats, Number(precisionEl.value));
    showResult(true);
  }

  function onClear(){
    inputEl.value = '';
    showError('');
    showResult(false);
    tableBody.innerHTML = '';
    countsEl.textContent = '';
  }

  function insertSample(){
    // Build a sample Float32Array and encode to Base64 so users can test
    const sample = new Float32Array([1.0, -2.5, 3.1415927, 0, 12345.678]);
    const bytes = new Uint8Array(sample.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    inputEl.value = b64;
    endSel.value = 'little';
    precisionEl.value = 6;
  }

  decodeBtn.addEventListener('click', onDecode);
  clearBtn.addEventListener('click', onClear);
  sampleBtn.addEventListener('click', insertSample);

  // If empty on load, prefill sample for quick try-out
  window.addEventListener('DOMContentLoaded', () => {
    if (!inputEl.value.trim()) insertSample();
  });
})();
