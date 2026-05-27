# iFood Benefícios — Cards Lab

Site experimental estático pra prototipar o design de cartões do iFood
Benefícios: dois cartões retangulares com cantos arredondados, alinhados
num grid, conectados por uma extrusão diagonal sólida (flat). Painel
lateral pra controlar tamanho, posição no grid e cor de cada um, mais
ajustes de raio, célula e intensidade da sombra.

## Como rodar localmente

Qualquer servidor estático serve. Sem build.

```bash
python3 -m http.server 8765
# abre http://localhost:8765
```

## Publicar (GitHub Pages)

1. Cria um repo no GitHub e sobe esses 3 arquivos na raiz (`index.html`,
   `style.css`, `app.js`).
2. Settings → Pages → Source: **Deploy from a branch**, branch `main`,
   pasta `/ (root)`. Save.
3. Em 1–2 min a URL fica disponível em
   `https://<user>.github.io/<repo>/`.

## Arquivos

- `index.html` — layout (canvas + painel)
- `style.css` — paleta iFood Benefícios + UI
- `app.js` — estado, render SVG, convex hull da extrusão, export

## Paleta usada

Vermelho `#ea1d2c`, Laranja `#ff8e0d`, Amarelo `#ffc247`, Verde
`#50a773`, Teal `#0da192`, Carbono `#3f3e3e`, Cream `#fff4ea`, Branco
`#ffffff`.
