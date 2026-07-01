// ==UserScript==
// @name         Onshape Metrics v3.1 - Onshape
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Onshape: WebGL info (CORRIGIDO), frame time, memory (CORRIGIDO), interaction, system info. Draggable panel.
// @author       Lexluthor
// @match        *://cad.onshape.com/*
// @match        *://*.onshape.com/*
// @icon         https://www.onshape.com/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  window.OnshapeMetricsTM = {
    samples: [],
    isCollecting: false,
    startTime: null,
    frameTimings: [],
    interactionEvents: [],
    lastMouseDownTime: 0,

    reset: function() {
      this.samples = [];
      this.startTime = null;
      this.frameTimings = [];
      this.interactionEvents = [];
      console.log('[Onshape Metrics] Reset OK');
      updateUI();
    },

    startCollecting: function() {
      if (this.isCollecting) return;
      this.isCollecting = true;
      this.startTime = Date.now();
      console.log('[Onshape Metrics] Start');
      updateUI();
    },

    stopCollecting: function() {
      this.isCollecting = false;
      console.log('[Onshape Metrics] Stop');
      updateUI();
    },

    exportCSV: function() {
      if (this.samples.length === 0) {
        alert('Nenhuma amostra coletada.');
        return;
      }
      var header = ['timestamp','elapsed_ms','webgl_vendor','webgl_renderer','webgl_version','max_texture_size','max_renderbuffer_size','webgl_extensions','frame_time_ms','frame_jitter_ms','memory_used_mb','memory_limit_mb','interaction_latency_ms','last_interaction','fps','visibility_state','viewport_w','viewport_h','hardware_concurrency','device_memory_gb','user_agent','platform','vendor'];
      var rows = [header.join(',')];
      for (var i = 0; i < this.samples.length; i++) {
        var s = this.samples[i];
        var row = [s.timestamp, s.elapsed_ms, '"' + (s.webgl_vendor || '') + '"', '"' + (s.webgl_renderer || '') + '"', '"' + (s.webgl_version || '') + '"', s.max_texture_size || '', s.max_renderbuffer_size || '', '"' + (s.webgl_extensions || '').substring(0,150) + '"', s.frame_time_ms || '', s.frame_jitter_ms || '', s.memory_used_mb || '', s.memory_limit_mb || '', s.interaction_latency_ms || '', s.last_interaction || '', s.fps || '', s.visibility_state || '', s.viewport_w || '', s.viewport_h || '', s.hardware_concurrency || '', s.device_memory_gb || '', '"' + (s.user_agent || '').substring(0,100) + '"', s.platform || '', s.vendor || ''];
        rows.push(row.join(','));
      }
      var csv = rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'onshape_metrics_' + new Date().getTime() + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  function getSystemInfo() {
    return {
      hardware_concurrency: navigator.hardwareConcurrency || 'N/A',
      device_memory_gb: navigator.deviceMemory || 'N/A',
      user_agent: navigator.userAgent || '',
      platform: navigator.platform || '',
      vendor: navigator.vendor || ''
    };
  }

  function getWebGLInfo() {
    try {
      var canvas = document.querySelector('canvas');
      if (!canvas) return null;
      var gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
      if (!gl) return null;
      var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      var vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
      var renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
      var version = gl.getParameter(gl.VERSION);
      var maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      var maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      var extensions = gl.getSupportedExtensions();
      var extensionsStr = extensions ? extensions.join(', ').substring(0,500) : 'N/A';
      return {
        vendor: vendor,
        renderer: renderer,
        version: version,
        max_texture_size: maxTextureSize,
        max_renderbuffer_size: maxRenderbufferSize,
        extensions: extensionsStr
      };
    } catch(e) {
      console.error('[Onshape] WebGL Error:', e);
      return null;
    }
  }

  function getMemoryInfo() {
    try {
      if (window.performance && window.performance.memory) {
        var mem = window.performance.memory;
        var used_mb = (mem.usedJSHeapSize / 1024 / 1024).toFixed(2);
        var limit_mb = (mem.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
        return { used_mb: used_mb, limit_mb: limit_mb };
      }
      if (navigator.deviceMemory) {
        return { used_mb: 'Device: ' + navigator.deviceMemory + 'GB', limit_mb: navigator.deviceMemory + 'GB' };
      }
      return { used_mb: 'N/A', limit_mb: 'N/A' };
    } catch(e) {
      return { used_mb: 'ERROR', limit_mb: 'ERROR' };
    }
  }

  function collectMetrics() {
    if (!window.OnshapeMetricsTM.isCollecting) return;
    try {
      var elapsed = Date.now() - window.OnshapeMetricsTM.startTime;
      var now = new Date().toISOString();
      var webglInfo = getWebGLInfo();
      var vendor = webglInfo ? webglInfo.vendor : '';
      var renderer = webglInfo ? webglInfo.renderer : '';
      var version = webglInfo ? webglInfo.version : '';
      var maxTextureSize = webglInfo ? webglInfo.max_texture_size : '';
      var maxRenderbufferSize = webglInfo ? webglInfo.max_renderbuffer_size : '';
      var extensions = webglInfo ? webglInfo.extensions : '';
      var memInfo = getMemoryInfo();
      var memUsed = memInfo ? memInfo.used_mb : 'N/A';
      var memLimit = memInfo ? memInfo.limit_mb : 'N/A';
      var frameTime = '';
      var frameJitter = '';
      if (window.OnshapeMetricsTM.frameTimings.length > 0) {
        frameTime = window.OnshapeMetricsTM.frameTimings[window.OnshapeMetricsTM.frameTimings.length - 1].toFixed(2);
        if (window.OnshapeMetricsTM.frameTimings.length >= 2) {
          var timings = window.OnshapeMetricsTM.frameTimings.slice(-10);
          var mean = timings.reduce(function(a,b){return a+b;}) / timings.length;
          var variance = timings.reduce(function(a,b){return a + Math.pow(b-mean, 2);}) / timings.length;
          frameJitter = Math.sqrt(variance).toFixed(2);
        }
      }
      var fps = '';
      if (frameTime && frameTime > 0) {
        fps = (1000 / frameTime).toFixed(2);
      }
      var interactionLatency = '';
      if (window.OnshapeMetricsTM.interactionEvents.length > 0) {
        interactionLatency = window.OnshapeMetricsTM.interactionEvents[window.OnshapeMetricsTM.interactionEvents.length - 1];
      }
      var lastInteraction = window.OnshapeMetricsTM.interactionEvents.length > 0 ? 'yes' : 'no';
      var visibility_state = document.visibilityState || 'unknown';
      var sysInfo = getSystemInfo();
      var sample = {
        timestamp: now,
        elapsed_ms: elapsed,
        webgl_vendor: vendor,
        webgl_renderer: renderer,
        webgl_version: version,
        max_texture_size: maxTextureSize,
        max_renderbuffer_size: maxRenderbufferSize,
        webgl_extensions: extensions,
        frame_time_ms: frameTime,
        frame_jitter_ms: frameJitter,
        memory_used_mb: memUsed,
        memory_limit_mb: memLimit,
        interaction_latency_ms: interactionLatency,
        last_interaction: lastInteraction,
        fps: fps,
        visibility_state: visibility_state,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        hardware_concurrency: sysInfo.hardware_concurrency,
        device_memory_gb: sysInfo.device_memory_gb,
        user_agent: sysInfo.user_agent,
        platform: sysInfo.platform,
        vendor: sysInfo.vendor
      };
      window.OnshapeMetricsTM.samples.push(sample);
    } catch(e) {
      console.error('[Onshape Metrics] Error:', e);
    }
  }

  function monitorFrameTiming() {
    var lastTime = performance.now();
    function tick() {
      var now = performance.now();
      var frameTime = now - lastTime;
      window.OnshapeMetricsTM.frameTimings.push(frameTime);
      if (window.OnshapeMetricsTM.frameTimings.length > 300) {
        window.OnshapeMetricsTM.frameTimings.shift();
      }
      lastTime = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

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

  function makeDraggable(element, headerElement) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (headerElement) {
      headerElement.onmousedown = dragMouseDown;
    } else {
      element.onmousedown = dragMouseDown;
    }
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function createUI() {
    var container = document.createElement('div');
    container.id = 'onshape-metrics-panel';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 99999; background: rgba(0,0,0,0.95); color: #fff; padding: 0; border-radius: 8px; font-family: monospace; font-size: 11px; box-shadow: 0 0 15px rgba(0,0,0,0.8); max-width: 340px; max-height: 500px; overflow-y: auto; border: 2px solid #00BCD4;';

    var header = document.createElement('div');
    header.id = 'onshape-metrics-header';
    header.style.cssText = 'padding: 10px 12px; background: #00BCD4; color: #000; font-weight: bold; cursor: move; user-select: none; border-bottom: 2px solid #000;';
    header.innerHTML = '🎨 Onshape Metrics v3.1';

    var content = document.createElement('div');
    content.style.cssText = 'padding: 12px;';
    content.innerHTML = '<div id="onshape-metrics-status" style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; border-left: 3px solid #00BCD4;"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px;"><button id="onshape-metrics-start" style="padding: 6px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">▶ Start</button><button id="onshape-metrics-stop" style="padding: 6px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">⏹ Stop</button><button id="onshape-metrics-reset" style="padding: 6px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">🔄 Reset</button><button id="onshape-metrics-export" style="padding: 6px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">⬇ CSV</button></div><div id="onshape-metrics-info" style="padding: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; border-left: 3px solid #00BCD4; max-height: 350px; overflow-y: auto; font-size: 10px;"></div>';

    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);
    makeDraggable(container, header);

    document.getElementById('onshape-metrics-start').onclick = function() { window.OnshapeMetricsTM.startCollecting(); };
    document.getElementById('onshape-metrics-stop').onclick = function() { window.OnshapeMetricsTM.stopCollecting(); };
    document.getElementById('onshape-metrics-reset').onclick = function() { window.OnshapeMetricsTM.reset(); };
    document.getElementById('onshape-metrics-export').onclick = function() { window.OnshapeMetricsTM.exportCSV(); };
  }

  function updateUI() {
    var status = document.getElementById('onshape-metrics-status');
    if (status) {
      var collecting = window.OnshapeMetricsTM.isCollecting ? '🔴 COLETANDO' : '⚫ PARADO';
      var count = window.OnshapeMetricsTM.samples.length;
      status.innerHTML = collecting + '<br>Amostras: ' + count;
    }
    var info = document.getElementById('onshape-metrics-info');
    if (info && window.OnshapeMetricsTM.samples.length > 0) {
      var last = window.OnshapeMetricsTM.samples[window.OnshapeMetricsTM.samples.length - 1];
      info.innerHTML = '<strong>Última amostra:</strong><br>FPS: ' + (last.fps || 'N/A') + '<br>Frame Time: ' + (last.frame_time_ms || 'N/A') + 'ms<br>GPU: ' + (last.webgl_renderer || 'N/A') + '<br>Memory: ' + last.memory_used_mb + ' / ' + last.memory_limit_mb + ' MB<br>Interaction: ' + (last.interaction_latency_ms || 'N/A') + 'ms<br>CPU Cores: ' + (last.hardware_concurrency || 'N/A') + '<br>Device RAM: ' + (last.device_memory_gb || 'N/A') + ' GB';
    }
  }

  window.addEventListener('load', function() {
    setTimeout(function() {
      createUI();
      monitorFrameTiming();
      monitorInteractions();
      setInterval(collectMetrics, 1000);
      setInterval(updateUI, 500);
      console.log('[Onshape Metrics v3.1] Ready');
    }, 2000);
  });

})();
