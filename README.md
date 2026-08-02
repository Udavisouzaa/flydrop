# FlyDrop / LevAí

Este repositório reúne as duas aplicações do projeto:

- aplicação web em Next.js, localizada na raiz do repositório;
- aplicativo mobile em Expo/React Native, localizado em [`mobile/`](mobile/).

## Aplicação web

Requisitos: Node.js e npm.

```bash
npm install
npm run dev
```

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000).

Validações disponíveis:

```bash
npm run lint
npm run build
```

## Aplicativo mobile

Requisitos: Node.js 24 e pnpm.

```bash
cd mobile
pnpm install
pnpm start
```

Para abrir diretamente no navegador:

```bash
pnpm web
```

Validações disponíveis:

```bash
pnpm typecheck
pnpm build:web
```

Mais detalhes sobre o MVP mobile estão em [`mobile/README.md`](mobile/README.md).

## Colaboração

Antes de começar uma alteração, atualize sua cópia local:

```bash
git switch main
git pull
git switch -c minha-alteracao
```

Depois de concluir:

```bash
git add <arquivos-alterados>
git commit -m "Descrição curta da alteração"
git push -u origin minha-alteracao
```

Abra um Pull Request no GitHub para que a outra pessoa possa revisar e incorporar a mudança na `main`.
