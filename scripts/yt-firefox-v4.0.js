// ==UserScript==
// @name         YT Metrics v3.4 - Firefox YouTube
// @namespace    http://tampermonkey.net/
// @version      3.4
// @description  YouTube Firefox: codec, resolution, FPS, dropped frames, buffer, jitter. Painel otimizado.
// @author       Lexluthor
// @match        *://www.youtube.com/*
// @icon         https://www.youtube.com/favicon.ico
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  window.YTMediaMetricsTM = {
    samples: [],
    isCollecting: false,
    startTime: null,
    lastFrameCount: 0,
    lastFrameTime: 0,
    frameTimings: [],

    reset: function() {
      this.samples = [];
      this.startTime = null;
      this.lastFrameCount = 0;
      this.lastFrameTime = 0;
      this.frameTimings = [];
      console.log('[YT Metrics] Reset OK');
      updateUI();
    },

    startCollecting: function() {
      if (this.isCollecting) return;
      this.isCollecting = true;
      this.startTime = Date.now();
      console.log('[YT Metrics] Start');
      updateUI();
    },

    stopCollecting: function() {
      this.isCollecting = false;
      console.log('[YT Metrics] Stop');
      updateUI();
    },

    exportCSV: function() {
      if (this.samples.length === 0) {
        alert('Nenhuma amostra coletada.');
        return;
      }
      var header = ['timestamp','elapsed_ms','codec','resolution','fps','droppedFrames','buffer_s','jitter_ms','frame_time_ms','playback_rate','paused','visibility_state','viewport_w','viewport_h','hardware_concurrency','device_memory_gb','user_agent','platform','vendor'];
      var rows = [header.join(',')];
      for (var i = 0; i < this.samples.length; i++) {
        var s = this.samples[i];
        var row = [s.timestamp, s.elapsed_ms, '"' + (s.codec || '') + '"', s.resolution || '', s.fps || '', s.droppedFrames || '', s.buffer_s || '', s.jitter_ms || '', s.frame_time_ms || '', s.playback_rate || '', s.paused || '', s.visibility_state || '', s.viewport_w || '', s.viewport_h || '', s.hardware_concurrency || '', s.device_memory_gb || '', '"' + (s.user_agent || '').substring(0,100) + '"', s.platform || '', s.vendor || ''];
        rows.push(row.join(','));
      }
      var csv = rows.join('\n');
      var blob = new Blob([csv], { type: 'text/csv' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'yt_metrics_' + new Date().getTime() + '.csv';
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

  function collectMetrics() {
    if (!window.YTMediaMetricsTM.isCollecting) return;
    try {
      var vid = document.querySelector('video');
      if (!vid) return;
      var elapsed = Date.now() - window.YTMediaMetricsTM.startTime;
      var now = new Date().toISOString();
      var codec = '';
      try {
        var pr = window.ytInitialPlayerResponse || (window.ytplayer && window.ytplayer.config && JSON.parse(window.ytplayer.config.args.player_response || '{}'));
        if (pr && pr.streamingData) {
          var formats = pr.streamingData.adaptiveFormats || pr.streamingData.formats || [];
          var codecs = [];
          for (var i = 0; i < formats.length; i++) {
            if (formats[i].mimeType && codecs.indexOf(formats[i].mimeType) === -1) codecs.push(formats[i].mimeType);
          }
          codec = codecs.join(' | ');
        }
      } catch(e){}
      var resolution = (vid.videoWidth && vid.videoHeight) ? (vid.videoWidth + 'x' + vid.videoHeight) : '';
      var droppedFrames = null, totalFrames = null;
      try {
        if (typeof vid.getVideoPlaybackQuality === 'function') {
          var q = vid.getVideoPlaybackQuality();
          droppedFrames = q.droppedVideoFrames;
          totalFrames = q.totalVideoFrames;
        } else {
          droppedFrames = vid.webkitDroppedFrameCount || null;
          totalFrames = vid.webkitDecodedFrameCount || null;
        }
      } catch(e){}
      var fps = null;
      if (totalFrames != null && window.YTMediaMetricsTM.lastFrameCount != null && elapsed > 100) {
        var frameDelta = totalFrames - window.YTMediaMetricsTM.lastFrameCount;
        var timeDelta = (Date.now() - window.YTMediaMetricsTM.lastFrameTime) / 1000;
        if (timeDelta > 0) fps = (frameDelta / timeDelta).toFixed(2);
      }
      window.YTMediaMetricsTM.lastFrameCount = totalFrames;
      window.YTMediaMetricsTM.lastFrameTime = Date.now();
      var buffer_s = 0;
      try {
        var b = vid.buffered;
        var ct = vid.currentTime || 0;
        for (var j = 0; j < b.length; j++) {
          if (ct >= b.start(j) && ct <= b.end(j)) {
            buffer_s = (b.end(j) - ct).toFixed(3);
            break;
          }
        }
      } catch(e){}
      var jitter_ms = '';
      if (window.YTMediaMetricsTM.frameTimings.length >= 2) {
        var timings = window.YTMediaMetricsTM.frameTimings.slice(-10);
        var mean = timings.reduce(function(a,b){return a+b;}) / timings.length;
        var variance = timings.reduce(function(a,b){return a + Math.pow(b-mean, 2);}) / timings.length;
        jitter_ms = Math.sqrt(variance).toFixed(2);
      }
      var frame_time_ms = '';
      if (window.YTMediaMetricsTM.frameTimings.length > 0) {
        frame_time_ms = window.YTMediaMetricsTM.frameTimings[window.YTMediaMetricsTM.frameTimings.length - 1].toFixed(2);
      }
      var playback_rate = vid.playbackRate || 1;
      var paused = vid.paused ? 'true' : 'false';
      var visibility_state = document.visibilityState || 'unknown';
      var sysInfo = getSystemInfo();
      var sample = {
        timestamp: now,
        elapsed_ms: elapsed,
        codec: codec,
        resolution: resolution,
        fps: fps,
        droppedFrames: droppedFrames,
        buffer_s: buffer_s,
        jitter_ms: jitter_ms,
        frame_time_ms: frame_time_ms,
        playback_rate: playback_rate,
        paused: paused,
        visibility_state: visibility_state,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        hardware_concurrency: sysInfo.hardware_concurrency,
        device_memory_gb: sysInfo.device_memory_gb,
        user_agent: sysInfo.user_agent,
        platform: sysInfo.platform,
        vendor: sysInfo.vendor
      };
      window.YTMediaMetricsTM.samples.push(sample);
    } catch(e) {
      console.error('[YT Metrics] Error:', e);
    }
  }

  function monitorFrameTiming() {
    var lastTime = performance.now();
    function tick() {
      var now = performance.now();
      var frameTime = now - lastTime;
      window.YTMediaMetricsTM.frameTimings.push(frameTime);
      if (window.YTMediaMetricsTM.frameTimings.length > 300) {
        window.YTMediaMetricsTM.frameTimings.shift();
      }
      lastTime = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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
    container.id = 'yt-metrics-panel';
    // CORRIGIDO: removido overflow-y e max-width, adicionado width fixo e height fit-content
    container.style.cssText = 'position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 2147483647 !important; background: rgba(0,0,0,0.95) !important; color: #fff !important; padding: 0 !important; border-radius: 8px !important; font-family: monospace !important; font-size: 11px !important; box-shadow: 0 0 15px rgba(0,0,0,0.8) !important; width: 240px !important; height: fit-content !important; border: 2px solid #FFD700 !important; display: block !important; visibility: visible !important; opacity: 1 !important;';

    var header = document.createElement('div');
    header.id = 'yt-metrics-header';
    header.style.cssText = 'padding: 8px 10px !important; background: #FFD700 !important; color: #000 !important; font-weight: bold !important; cursor: move !important; user-select: none !important; border-bottom: 2px solid #000 !important;';
    header.innerHTML = '📊 YT Metrics v3.4';

    var content = document.createElement('div');
    content.style.cssText = 'padding: 10px !important;';
    // CORRIGIDO: yt-metrics-info começa com display:none, aparece só quando houver dados
    content.innerHTML = '<div id="yt-metrics-status" style="margin-bottom: 8px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 3px; border-left: 3px solid #FFD700; font-size: 11px;"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 8px;"><button id="yt-metrics-start" style="padding: 5px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">▶ Start</button><button id="yt-metrics-stop" style="padding: 5px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">⏹ Stop</button><button id="yt-metrics-reset" style="padding: 5px; background: #FF9800; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">🔄 Reset</button><button id="yt-metrics-export" style="padding: 5px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">⬇ CSV</button></div><div id="yt-metrics-info" style="display: none; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 3px; border-left: 3px solid #2196F3; font-size: 11px; line-height: 1.4;"></div>';

    container.appendChild(header);
    container.appendChild(content);
    document.body.appendChild(container);
    makeDraggable(container, header);

    document.getElementById('yt-metrics-start').onclick = function() { window.YTMediaMetricsTM.startCollecting(); };
    document.getElementById('yt-metrics-stop').onclick = function() { window.YTMediaMetricsTM.stopCollecting(); };
    document.getElementById('yt-metrics-reset').onclick = function() { window.YTMediaMetricsTM.reset(); };
    document.getElementById('yt-metrics-export').onclick = function() { window.YTMediaMetricsTM.exportCSV(); };
  }

  function updateUI() {
    var status = document.getElementById('yt-metrics-status');
    if (status) {
      var collecting = window.YTMediaMetricsTM.isCollecting ? '🔴 COLETANDO' : '⚫ PARADO';
      var count = window.YTMediaMetricsTM.samples.length;
      status.innerHTML = collecting + '<br>Amostras: ' + count;
    }
    var info = document.getElementById('yt-metrics-info');
    if (info) {
      if (window.YTMediaMetricsTM.samples.length > 0) {
        var last = window.YTMediaMetricsTM.samples[window.YTMediaMetricsTM.samples.length - 1];
        info.innerHTML = '<strong>Última amostra:</strong><br>Resolução: ' + last.resolution + '<br>FPS: ' + (last.fps || 'N/A') + '<br>Dropped: ' + (last.droppedFrames || 'N/A') + '<br>Buffer: ' + (last.buffer_s || 'N/A') + 's<br>Jitter: ' + (last.jitter_ms || 'N/A') + 'ms<br>CPU Cores: ' + (last.hardware_concurrency || 'N/A') + '<br>Device RAM: ' + (last.device_memory_gb || 'N/A') + ' GB';
        // CORRIGIDO: exibe o bloco de métricas apenas quando há dados
        info.style.display = 'block';
      } else {
        info.style.display = 'none';
      }
    }
  }

  window.addEventListener('load', function() {
    setTimeout(function() {
      createUI();
      monitorFrameTiming();
      setInterval(collectMetrics, 1000);
      setInterval(updateUI, 500);
      console.log('[YT Metrics v3.4] Ready');
    }, 1000);
  });

  setInterval(function() {
    var panel = document.getElementById('yt-metrics-panel');
    if (panel) {
      panel.style.display = 'block';
      panel.style.visibility = 'visible';
      panel.style.opacity = '1';
    }
  }, 2000);

})();
