# Como Instalar os Scripts

## Pré-requisitos
- Navegador moderno (Firefox 115+, Chrome 148+, Supermium 144+)
- Extensão Tampermonkey instalada

## Passo a Passo

### 1. Instale Tampermonkey

**Firefox**: https://addons.mozilla.org/firefox/addon/tampermonkey/  
**Chrome**: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobp55f  
**Supermium**: Idêntico ao Chrome

### 2. Abra o Dashboard do Tampermonkey

Clique no ícone do Tampermonkey na barra de extensões

### 3. Crie um novo script

Clique em **"Create a new script"** ou no ícone **+**

### 4. Copie o código

Escolha o script que deseja:
- [Onshape Firefox v3.3](../scripts/onshape-firefox-v3.3.js)
- [YT Firefox v3.4](../scripts/yt-firefox-v3.4.js)
- [Onshape Chrome v3.1](../scripts/onshape-chrome-v3.1.js)
- [YT Chrome v3.3](../scripts/yt-chrome-v3.3.js)

Copie TODO o código e cole no editor do Tampermonkey

### 5. Salve

Pressione **Ctrl+S** ou clique em **Save**

### 6. Ative

O script deve estar habilitado (checkbox marcado ao lado do nome)

### 7. Visite o site

Acesse Onshape.com ou YouTube.com - o painel deve aparecer!

## Verificar se está funcionando

Abra o **Console do Navegador** (F12):
- Procure por mensagens `[Onshape Metrics]` ou `[YT Metrics]`
- Deve haver uma mensagem `Ready` ou semelhante

## Desinstalar

1. Abra o dashboard do Tampermonkey
2. Localize o script
3. Clique em **Remover** ou na lixeira

## Atualizar

Quando uma nova versão sair:
1. Abra o script no editor
2. Substitua TODO o código pela nova versão
3. Salve (Ctrl+S)
4. Recarregue a página (F5)

---

**Precisa de ajuda?** [Abra uma issue](../../issues)
