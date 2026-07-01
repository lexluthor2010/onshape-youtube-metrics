// ==UserScript==
// @name         Onshape Metrics v3.2 - Chromium
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Onshape Chromium: GPU (ANGLE correto), frame time, memoria JS real, interaction, system info. Draggable.
// @author       Lexluthor
// @match        *://cad.onshape.com/*
// @match        *://*.onshape.com/*
// @icon         https://www.onshape.com/favicon.ico
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  // ─── GUARDA PRIMÁRIA ──────────────────────────────────────────────────────────
  // @noframes no cabecalho ja impede execucao em iframes no Tampermonkey.
  // Esta verificacao extra protege caso o Tampermonkey ignore @noframes
  // em alguma versao ou configuracao (ex: "Create Drawing" que embute iframe 3D).
  if (window !== window.top) return;

  // Impede duplicatas se o script for injetado mais de uma vez
  if (window.__OnshapeMetricsCRLoaded) return;
  window.__OnshapeMetricsCRLoaded = true;

  // ─── ESTADO GLOBAL ────────────────────────────────────────────────────────────
  window.OnshapeMetricsTM = {
    samples: [],
    isCollecting: false,
    startTime: null,
    frameTimings: [],
    interactionEvents: [],
    lastMouseDownTime: 0,
    gpuName: 'Detectando...',
    gpuVendor: '',

    reset: function() {
      this.samples = [];
      this.startTime = null;
      this.frameTimings = [];
      this.interactionEvents = [];
      updateUI();
    },

    startCollecting: function() {
      if (this.isCollecting) return;
      this.isCollecting = true;
      this.startTime = Date.now();
      updateUI();
    },

    stopCollecting: function() {
      this.isCollecting = false;
      updateUI();
    },

    exportCSV: function() {
      if (this.samples.length === 0) { alert('Nenhuma amostra coletada.'); return; }
      var header = ['timestamp','elapsed_ms','webgl_vendor','webgl_renderer','webgl_version',
                    'max_texture_size','max_renderbuffer_size','frame_time_ms','frame_jitter_ms',
                    'memory_used_mb','memory_limit_mb','interaction_latency_ms','last_interaction',
                    'fps','visibility_state','viewport_w','viewport_h',
                    'hardware_concurrency','device_memory_gb','user_agent','platform','vendor'];
      var rows = [header.join(',')];
      for (var i = 0; i < this.samples.length; i++) {
        var s = this.samples[i];
        rows.push([
          s.timestamp, s.elapsed_ms,
          '"' + (s.webgl_vendor || '') + '"',
          '"' + (s.webgl_renderer || '') + '"',
          '"' + (s.webgl_version || '') + '"',
          s.max_texture_size || '', s.max_renderbuffer_size || '',
          s.frame_time_ms || '', s.frame_jitter_ms || '',
          s.memory_used_mb || '', s.memory_limit_mb || '',
          s.interaction_latency_ms || '', s.last_interaction || '',
          s.fps || '', s.visibility_state || '',
          s.viewport_w || '', s.viewport_h || '',
          s.hardware_concurrency || '', s.device_memory_gb || '',
          '"' + (s.user_agent || '').substring(0, 120) + '"',
          s.platform || '', s.vendor || ''
        ].join(','));
      }
      var csv = rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'onshape_metrics_' + Date.now() + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ─── GPU (Chromium + ANGLE) ───────────────────────────────────────────────────
  //
  // No Chromium, o ANGLE usa o formato:
  //   "ANGLE (Vendor, GPU Name Direct3D11 vs_5_0 ps_5_0, D3D11-versao)"
  // O nome real da GPU esta entre a 1a e a 2a virgula, antes de "Direct3D".
  // Tentamos primeiro o canvas existente do Onshape, depois um canvas novo.
  //
  function detectGPU() {
    // Tentativa 1: canvas existente do Onshape (mais direto)
    tryCanvases(document.querySelectorAll('canvas'));
  }

  function tryCanvases(canvases) {
    for (var i = 0; i < canvases.length; i++) {
      if (readGLContext(canvases[i])) return;
    }
    // Tentativa 2: canvas novo
    var c = document.createElement('canvas');
    c.width = 1; c.height = 1;
    if (!readGLContext(c)) {
      window.OnshapeMetricsTM.gpuName   = 'N/A';
      window.OnshapeMetricsTM.gpuVendor = 'N/A';
    }
    updateUI();
  }

  function readGLContext(canvas) {
    try {
      var gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' })
             || canvas.getContext('webgl')
             || canvas.getContext('experimental-webgl');
      if (!gl) return false;
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (!dbg) return false;
      var raw    = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
      var vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   || '';
      if (!raw) return false;
      console.log('[Onshape CR] ANGLE raw:', raw);
      window.OnshapeMetricsTM.gpuName   = parseANGLE(raw);
      window.OnshapeMetricsTM.gpuVendor = vendor;
      updateUI();
      return true;
    } catch(e) { return false; }
  }

  // Chromium ANGLE: "ANGLE (NVIDIA, NVIDIA GeForce GT 710 Direct3D11 vs_5_0 ps_5_0, D3D11-ver)"
  // Firefox ANGLE:  "ANGLE (NVIDIA GeForce GT 710 Direct3D11 vs_5_0 ps_5_0)"
  // Sem ANGLE:      "GeForce GT 710/PCIe/SSE2"
  function parseANGLE(raw) {
    if (!raw) return 'N/A';
    if (raw.indexOf('ANGLE') === -1) {
      return raw.replace(/\/PCIe\/SSE2.*/i, '').replace(/\/SSE2.*/i, '').trim();
    }
    // Formato Chromium: virgulas separam vendor, gpu, versao
    var mCR = raw.match(/ANGLE\s*\(\s*[^,]+,\s*([^,]+?)\s+Direct3D/i);
    if (mCR) return mCR[1].trim();
    // Formato Firefox sem virgulas
    var mFF = raw.match(/ANGLE\s*\(\s*(.+?)\s+Direct3D/i);
    if (mFF) return mFF[1].trim();
    // Qualquer coisa antes de vs_ (vertex shader)
    var mVS = raw.match(/ANGLE\s*\(\s*(.+?)\s+vs_\d/i);
    if (mVS) return mVS[1].trim();
    return raw;
  }

  // ─── WEBGL CAPABILITIES ───────────────────────────────────────────────────────
  function getWebGLCaps() {
    try {
      var canvas = document.querySelector('canvas') || document.createElement('canvas');
      canvas.width = canvas.width || 1;
      canvas.height = canvas.height || 1;
      var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return {};
      return {
        version:              gl.getParameter(gl.VERSION),
        max_texture_size:     gl.getParameter(gl.MAX_TEXTURE_SIZE),
        max_renderbuffer_size: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
      };
    } catch(e) { return {}; }
  }

  // ─── MEMÓRIA (Chromium expoe performance.memory) ───────────────────────────
  function getMemoryInfo() {
    if (window.performance && window.performance.memory) {
      var m = performance.memory;
      return {
        used_mb:  (m.usedJSHeapSize  / 1048576).toFixed(2),
        limit_mb: (m.jsHeapSizeLimit / 1048576).toFixed(2)
      };
    }
    var ram = navigator.deviceMemory;
    return {
      used_mb:  ram ? 'Device: ~' + ram + 'GB' : 'N/A',
      limit_mb: ram ? ram + 'GB'                 : 'N/A'
    };
  }

  // ─── COLETA DE MÉTRICAS ────────────────────────────────────────────────────
  function collectMetrics() {
    if (!window.OnshapeMetricsTM.isCollecting) return;
    try {
      var elapsed = Date.now() - window.OnshapeMetricsTM.startTime;
      var caps = getWebGLCaps();
      var mem  = getMemoryInfo();

      var frameTime = '', frameJitter = '';
      var ft = window.OnshapeMetricsTM.frameTimings;
      if (ft.length > 0) {
        frameTime = ft[ft.length - 1].toFixed(2);
        if (ft.length >= 2) {
          var slice    = ft.slice(-10);
          var mean     = slice.reduce(function(a,b){return a+b;}) / slice.length;
          var variance = slice.reduce(function(a,b){return a + Math.pow(b-mean,2);}) / slice.length;
          frameJitter  = Math.sqrt(variance).toFixed(2);
        }
      }
      var fps = (frameTime && parseFloat(frameTime) > 0)
        ? (1000 / parseFloat(frameTime)).toFixed(2) : '';

      var ie = window.OnshapeMetricsTM.interactionEvents;
      var interactionLatency = ie.length > 0 ? ie[ie.length - 1] : '';

      window.OnshapeMetricsTM.samples.push({
        timestamp:             new Date().toISOString(),
        elapsed_ms:            elapsed,
        webgl_vendor:          window.OnshapeMetricsTM.gpuVendor,
        webgl_renderer:        window.OnshapeMetricsTM.gpuName,
        webgl_version:         caps.version               || '',
        max_texture_size:      caps.max_texture_size      || '',
        max_renderbuffer_size: caps.max_renderbuffer_size || '',
        frame_time_ms:         frameTime,
        frame_jitter_ms:       frameJitter,
        memory_used_mb:        mem.used_mb,
        memory_limit_mb:       mem.limit_mb,
        interaction_latency_ms: interactionLatency,
        last_interaction:      ie.length > 0 ? 'yes' : 'no',
        fps:                   fps,
        visibility_state:      document.visibilityState || 'unknown',
        viewport_w:            window.innerWidth,
        viewport_h:            window.innerHeight,
        hardware_concurrency:  navigator.hardwareConcurrency || 'N/A',
        device_memory_gb:      navigator.deviceMemory        || 'N/A',
        user_agent:            navigator.userAgent           || '',
        platform:              navigator.platform            || '',
        vendor:                navigator.vendor              || ''
      });
    } catch(e) {
      console.error('[Onshape Metrics] Erro coleta:', e);
    }
  }

  // ─── FRAME TIMING ─────────────────────────────────────────────────────────
  function monitorFrameTiming() {
    var lastTime = performance.now();
    function tick() {
      var now = performance.now();
      window.OnshapeMetricsTM.frameTimings.push(now - lastTime);
      if (window.OnshapeMetricsTM.frameTimings.length > 300) {
        window.OnshapeMetricsTM.frameTimings.shift();
      }
      lastTime = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ─── INTERAÇÕES ───────────────────────────────────────────────────────────
  function monitorInteractions() {
    document.addEventListener('mousedown', function() {
      window.OnshapeMetricsTM.lastMouseDownTime = performance.now();
    });
    document.addEventListener('mousemove', function() {
      if (window.OnshapeMetricsTM.lastMouseDownTime > 0) {
        var latency = performance.now() - window.OnshapeMetricsTM.lastMouseDownTime;
        window.OnshapeMetricsTM.interactionEvents.push(latency.toFixed(2));
        if (window.OnshapeMetricsTM.interactionEvents.length > 100) {
          window.OnshapeMetricsTM.interactionEvents.shift();
        }
        window.OnshapeMetricsTM.lastMouseDownTime = 0;
      }
    });
  }

  // ─── DRAG ─────────────────────────────────────────────────────────────────
  function makeDraggable(el, handle) {
    var p1=0, p2=0, p3=0, p4=0;
    handle.onmousedown = function(e) {
      e.preventDefault();
      p3 = e.clientX; p4 = e.clientY;
      document.onmouseup   = function() { document.onmouseup = null; document.onmousemove = null; };
      document.onmousemove = function(e) {
        p1 = p3 - e.clientX; p2 = p4 - e.clientY;
        p3 = e.clientX;      p4 = e.clientY;
        el.style.top  = (el.offsetTop  - p2) + 'px';
        el.style.left = (el.offsetLeft - p1) + 'px';
      };
    };
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  function createUI() {
    // Guard: nao cria um segundo painel se ja existir
    if (document.getElementById('onshape-metrics-panel')) return;
    if (!document.body) return;

    var panel = document.createElement('div');
    panel.id = 'onshape-metrics-panel';
    panel.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'z-index:99999',
      'background:rgba(0,0,0,0.95)', 'color:#fff', 'padding:0',
      'border-radius:8px', 'font-family:monospace', 'font-size:11px',
      'box-shadow:0 0 15px rgba(0,0,0,0.8)', 'width:300px',
      'border:2px solid #00BCD4'
    ].join(';');

    var header = document.createElement('div');
    header.id = 'onshape-metrics-header';
    header.style.cssText = 'padding:10px 12px;background:#00BCD4;color:#000;font-weight:bold;cursor:move;user-select:none;border-radius:6px 6px 0 0;border-bottom:2px solid #000;';
    header.textContent = 'Onshape Metrics v1.0 - Chromium';

    var body = document.createElement('div');
    body.style.cssText = 'padding:12px;';
    body.innerHTML = [
      '<div id="onshape-metrics-status" style="margin-bottom:8px;padding:8px;background:rgba(255,255,255,0.1);border-radius:4px;border-left:3px solid #00BCD4;font-size:11px;line-height:1.5;"></div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;">',
        '<button id="onshape-metrics-start"  style="padding:6px;background:#4CAF50;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;">&#9654; Start</button>',
        '<button id="onshape-metrics-stop"   style="padding:6px;background:#f44336;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;">&#9632; Stop</button>',
        '<button id="onshape-metrics-reset"  style="padding:6px;background:#FF9800;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;">&#8635; Reset</button>',
        '<button id="onshape-metrics-export" style="padding:6px;background:#2196F3;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;">&#8659; CSV</button>',
      '</div>',
      '<div id="onshape-metrics-info" style="display:none;padding:8px;background:rgba(255,255,255,0.05);border-radius:4px;font-size:11px;line-height:1.5;"></div>'
    ].join('');

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);
    makeDraggable(panel, header);

    document.getElementById('onshape-metrics-start').onclick  = function() { window.OnshapeMetricsTM.startCollecting(); };
    document.getElementById('onshape-metrics-stop').onclick   = function() { window.OnshapeMetricsTM.stopCollecting(); };
    document.getElementById('onshape-metrics-reset').onclick  = function() { window.OnshapeMetricsTM.reset(); };
    document.getElementById('onshape-metrics-export').onclick = function() { window.OnshapeMetricsTM.exportCSV(); };
  }

  function updateUI() {
    var status = document.getElementById('onshape-metrics-status');
    if (status) {
      var dot   = window.OnshapeMetricsTM.isCollecting ? '#f44336' : '#888';
      var state = window.OnshapeMetricsTM.isCollecting ? 'COLETANDO' : 'PARADO';
      var mem   = getMemoryInfo();
      status.innerHTML =
        '<span style="color:' + dot + ';font-size:13px;">&#9679;</span> ' + state + '<br>' +
        'Amostras: ' + window.OnshapeMetricsTM.samples.length + '<br>' +
        'GPU: ' + window.OnshapeMetricsTM.gpuName;
    }

    var info = document.getElementById('onshape-metrics-info');
    if (info) {
      var s = window.OnshapeMetricsTM.samples;
      if (s.length > 0) {
        var last = s[s.length - 1];
        info.style.display = 'block';
        info.innerHTML =
          '<strong>Ultima amostra:</strong><br>' +
          'FPS: '        + (last.fps             || 'N/A') + '<br>' +
          'Frame Time: ' + (last.frame_time_ms   || 'N/A') + ' ms<br>' +
          'Jitter: '     + (last.frame_jitter_ms || 'N/A') + ' ms<br>' +
          'GPU: '        + (last.webgl_renderer  || 'N/A') + '<br>' +
          'Memory: '     + last.memory_used_mb + ' / ' + last.memory_limit_mb + ' MB<br>' +
          'Interaction: '+ (last.interaction_latency_ms || 'N/A') + ' ms<br>' +
          'CPU Cores: '  + (last.hardware_concurrency   || 'N/A') + '<br>' +
          'Device RAM: ' + (last.device_memory_gb       || 'N/A') + ' GB';
      } else {
        info.style.display = 'none';
      }
    }
  }

  // ─── INICIALIZAÇÃO ─────────────────────────────────────────────────────────
  window.addEventListener('load', function() {
    setTimeout(function() {
      createUI();
      // Detecta GPU: tenta canvases que o Onshape criou (ja disponiveis apos load)
      detectGPU();
      monitorFrameTiming();
      monitorInteractions();
      setInterval(collectMetrics, 1000);
      setInterval(updateUI, 500);
      console.log('[Onshape Metrics Chromium v1.0] Pronto. Frame:', window === window.top ? 'principal' : 'iframe');
    }, 2000);
  });

})();
