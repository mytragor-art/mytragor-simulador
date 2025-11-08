Mytragor — Hub package

O conteúdo desta pasta (`hub_package`) é um pequeno pacote de apoio para fazer upload em um host estático (GitHub Pages, Netlify, Itch.io, etc.). Ele inclui um `index.html` leve que funciona como um launcher/landing e links rápidos para o `index.html` principal e para o simulador.

Como usar

1. Copie todo o conteúdo da pasta `simulador` (ou do repositório) para o host. A estrutura de pastas deve ser preservada exatamente (assets/, ai/, controllers/, game/, net/, etc.).
2. Garanta que `index.html` esteja no diretório raiz do deploy. O arquivo `hub_package/index.html` é apenas uma alternativa de landing — o arquivo principal do jogo é `index.html` na raiz.
3. Para multiplayer (opcional): o cliente usa WebSocket em `ws://localhost:8080` por padrão — para partidas multiplayer você precisa rodar o servidor WS (se disponível) e ajustar a URL no modal de multiplayer.

Recomendações

- Teste localmente com um servidor estático antes de subir (por exemplo, `npx serve` ou `python -m http.server`).
- Se for hospedar em Itch.io, envie a pasta inteira e aponte o HTML root para `index.html`.
- Se desejar que o jogo seja inicializado automaticamente sem interface de deploy, mantenha `index.html` como página inicial do site.

Licença

Este pacote inclui apenas arquivos de demo e assets do projeto — mantenha a mesma licença do repositório original ao publicar.
