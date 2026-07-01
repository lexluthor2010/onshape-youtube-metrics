# Limitações do Firefox nos Scripts

## Informações de Sistema

### ✅ Funciona
- **FPS**: Via `requestAnimationFrame`
- **Frame Time**: Jitter e timing
- **Resolução**: Dimensões da viewport
- **CPU Cores**: `navigator.hardwareConcurrency`
- **Device Memory**: `navigator.deviceMemory` (limitado)

### ⚠️ Limitado
- **Memory (Heap)**: `performance.memory` - apenas dados de JS heap, não da aplicação inteira
- **GPU Name**: Extração via ANGLE pode variar

## GPU Name - O Problema

No Firefox, WebGL expõe a GPU via ANGLE, que pode incluir múltiplas GPUs. O script tenta extrair a correta, mas a precisão depende da:

1. Versão do Firefox
2. Driver NVIDIA/AMD/Intel
3. Configuração do sistema

### Como Verificar a GPU Real

1. Digite `about:support` na barra de endereços
2. Procure por **"Graphics"** ou **"GPU"**
3. Veja em:
   - `Renderizador do driver WebGL 1`: contém a GPU
   - `Renderizador do driver WebGL 2`: contém a GPU
   - `GPU #1 > Descrição`: nome exato da GPU

### Se o Script Mostrar a GPU Errada

**Por enquanto, consulte `about:support` manualmente.**

Queremos corrigir isso! [Abra uma issue](../../issues) com:
