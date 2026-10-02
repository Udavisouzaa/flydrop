# Malotex

**Protótipo de marketplace para conectar pessoas que precisam enviar itens a viajantes com trajetos compatíveis.**

O projeto explora a publicação de viagens e pedidos, a combinação entre as partes e a comunicação depois da conexão. O objetivo do repositório é mostrar o produto em construção e as decisões de implementação, sem apresentar funcionalidades ainda não verificadas como serviço pronto.

## Por que o repositório se chama flydrop?

O nome do produto evoluiu de **FlyDrop** para **LevAí** e, por fim, **Malotex**. A pasta, o repositório e parte da infraestrutura mantiveram o nome técnico flydrop para preservar integrações existentes. **Malotex é o nome definitivo do produto.**

## O que está no código

- Interface web em Next.js e TypeScript.
- Estruturas para perfis, viagens, pedidos, propostas, mensagens, avaliações e pagamentos.
- Banco de dados e autenticação com Supabase.
- Planejamento e limites conhecidos registrados em [ROADMAP.md](ROADMAP.md) e [VALIDACAO.md](VALIDACAO.md).

## Estado do projeto

O [site do Malotex](https://malotex.com.br) está acessível, mas isso não confirma que todos os fluxos autenticados, pagamentos, reembolsos e disputas estejam prontos. O roadmap contém pendências e datas de planejamento que podem estar desatualizadas. Este repositório deve ser lido como um projeto em desenvolvimento.

## Executar localmente

Instale as dependências com npm install e rode npm run dev. As áreas que dependem de autenticação, banco ou pagamentos exigem a configuração dos respectivos serviços externos. Não publique credenciais no repositório.

---

**English:** Malotex is a work in progress marketplace prototype connecting travelers with people who need to send items along compatible routes. The repository retains its technical name flydrop from an earlier branding stage. A reachable website does not verify end to end functionality or payment readiness.
