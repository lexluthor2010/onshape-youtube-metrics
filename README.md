# Onshape & YouTube Metrics - Tampermonkey Scripts

Coleção de scripts Tampermonkey para monitorar métricas de performance em tempo real no Onshape e YouTube.

## 📊 Scripts Disponíveis

### Firefox
- ✅ **Onshape Metrics v3.3** - GPU (corrigido), Frame Time, Memory, Interaction
- ✅ **YT Metrics v3.4** - Resolução, FPS, Dropped Frames, Buffer, Jitter

### Chrome / Chromium
- ✅ **Onshape Metrics v3.1** - Todas as métricas funcionando
- ⏳ **YT Metrics v3.3** - Panel não aparece (comunidade)

### Supermium
- ✅ **Onshape Metrics v3.1** - Funciona como Chrome
- ⏳ **YT Metrics v3.1** - Mesmo problema do Chrome (comunidade)

## 🚀 Como Instalar

1. Instale a extensão [Tampermonkey](https://www.tampermonkey.net/) no seu navegador
2. Vá até a seção [Scripts](./scripts/) 
3. Copie o código do script desejado
4. No Tampermonkey, clique em **"Create a new script"** (ícone +)
5. Cole o código e salve (Ctrl+S)
6. Visite o site (Onshape.com ou YouTube.com) e o painel deve aparecer

## ⚠️ Limitações Conhecidas

### Firefox
- **Memory da página**: Limitado pela API do browser
- **GPU Name**: Extração de ANGLE pode variar por versão
- Firefox 115.25+ ESR é a versão testada

### Chrome / YouTube
- Painel não aparece no YouTube (comunidade pode ajudar!)

### Supermium
- Mesmo comportamento do Chrome

## 📥 Exportar Dados

Todos os scripts têm botão **"CSV"** para exportar as métricas coletadas.

## 🐛 Reportar Problemas

Encontrou um bug? [Abra uma issue](../../issues) com:
- Navegador e versão
- Sistema operacional
- Screenshot do erro

## 🤝 Contribuir

Quer ajudar? Abra um Pull Request ou uma Issue!

---

**Autor**: Lexluthor (@lexluthor2010)  
**Última atualização**: 2026-07-01
