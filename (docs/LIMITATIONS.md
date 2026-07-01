# Firefox Script Limitations

This document describes the current limitations of the Firefox version of YT Metrics and explains why some information cannot be collected directly by JavaScript.

---

# Available Metrics

The following information is collected successfully.

| Metric | Status | Source |
|---------|--------|--------|
| FPS | ✅ | requestAnimationFrame |
| Frame Time | ✅ | requestAnimationFrame |
| Frame Jitter | ✅ | requestAnimationFrame |
| Video Resolution | ✅ | HTML5 Video API |
| Buffer Size | ✅ | HTML5 Video API |
| Dropped Frames | ✅ | getVideoPlaybackQuality() |
| Playback Rate | ✅ | HTML5 Video API |
| CPU Threads | ✅ | navigator.hardwareConcurrency |
| Device Memory | ⚠️ | navigator.deviceMemory (limited support) |
| Viewport Size | ✅ | Window API |

---

# Metrics Not Available

For security reasons Firefox does **not** expose some hardware information to JavaScript.

Unavailable metrics include:

- GPU utilization
- GPU memory usage
- CPU utilization
- Total RAM usage
- Browser process memory
- Video decoder statistics
- Direct3D decoder state
- DXVA status

These values can only be obtained using external tools such as:

- about:support
- Windows Task Manager
- Windows Performance Monitor
- GPU-Z
- HWiNFO
- Process Explorer

---

# GPU Detection

The script detects the GPU through WebGL.

It uses:

```
WEBGL_debug_renderer_info
```

Typical output:

```
ANGLE (NVIDIA GeForce GT 710 Direct3D11 vs_5_0 ps_5_0)
```

GPU identification may vary depending on:

- Firefox version
- Graphics driver
- ANGLE implementation
- Multi-GPU systems
- Operating System

---

# Checking the Real GPU

For the most reliable information:

1. Open:

```
about:support
```

2. Scroll to:

```
Graphics
```

3. Locate:

- GPU #1 Description
- WebGL Renderer
- WebGL2 Renderer

These values represent the actual graphics adapter used by Firefox.

---

# Memory Information

`performance.memory` exposes only JavaScript heap statistics.

Available:

- usedJSHeapSize
- totalJSHeapSize
- jsHeapSizeLimit

Unavailable:

- GPU Memory
- Browser Native Memory
- Video Buffers
- CPU Usage
- GPU Usage
- Operating System Memory

---

# Why?

Modern browsers intentionally isolate JavaScript from operating system internals.

This protects users against:

- Fingerprinting
- Privacy leaks
- Security attacks

Because of this limitation, userscripts cannot directly access Windows, Linux or macOS performance counters.

---

# Future Improvements

Possible future implementations:

- Native browser extension
- WebDriver integration
- Windows WMI support
- Linux /proc integration
- GPU-Z integration
- HWiNFO integration
- Native helper application
- Automatic benchmark report

---

# Tested Environment

| Component | Version |
|-----------|---------|
| Browser | Firefox 140 (64-bit) |
| Operating System | Windows 7 Professional SP1 (64-bit) |
| CPU | AMD Phenom™ 9650 Quad-Core @ 2.30 GHz |
| RAM | 8 GB |
| GPU | NVIDIA GeForce GT 710 |
| Direct3D | Direct3D 11 |
| WebGL | WebGL 2.0 (ANGLE) |
| Tampermonkey | Firefox Compatible Version |

---

# Project Goal

This project was created to benchmark browser performance on legacy hardware.

Current workloads include:

- YouTube
- YouTube Shorts
- HTML5 Video
- WebGL
- Onshape
- Browser Performance
- Hardware Acceleration

The objective is to provide reproducible benchmark data for comparing browsers such as Firefox, Chromium, Supermium, Opera and future Chromium-based projects.

---

# Need Help?

If you discover incorrect hardware detection or browser-specific behavior, please open an Issue including:

- Browser version
- Operating System
- CPU
- GPU
- Driver version
- about:support (Graphics section)
- Generated CSV
- Description of the issue
