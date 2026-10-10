# Malotex

**Protótipo de marketplace para conectar pessoas que precisam enviar itens a viajantes com trajetos compatíveis.**

O projeto explora a publicação de viagens e pedidos, a combinação entre as partes e a comunicação depois da conexão. O objetivo do repositório é mostrar o produto em construção e as decisões de implementação, sem apresentar funcionalidades ainda não verificadas como serviço pronto.

## Evolução do projeto

A [MALAH](https://github.com/Udavisouzaa/MALAH) foi uma etapa inicial desta mesma ideia, registrada em outro repositório como experimento de landing page. Depois, o produto passou pelos nomes **FlyDrop** e **LevAí**, chegando ao nome definitivo **Malotex**. Esses repositórios e nomes representam fases do mesmo projeto, não startups independentes.

A pasta, este repositório e parte da infraestrutura mantiveram o nome técnico flydrop para preservar integrações existentes.

## O que está no código

- Interface web em Next.js e TypeScript.
- Estruturas para perfis, viagens, pedidos, propostas, mensagens, avaliações e pagamentos.
- Banco de dados e autenticação com Supabase.
- Permissão modelada no banco (RLS, triggers e funções), não na aplicação: 15 migrations.
- Registro de decisões, limites e retrospectiva em [ROADMAP.md](ROADMAP.md) e [VALIDACAO.md](VALIDACAO.md).

## Estado do projeto

**O desenvolvimento foi encerrado em outubro de 2026, com o escopo fechado e documentado.**

O [site do Malotex](https://malotex.com.br) está acessível, mas isso não confirma que os fluxos autenticados, pagamentos, reembolsos e disputas estejam prontos — e não estão. A taxa de conexão nunca foi cobrada uma vez, nenhuma tela autenticada foi usada por um humano, e a validação de demanda registrada em [VALIDACAO.md](VALIDACAO.md) nunca saiu do zero.

O [ROADMAP.md](ROADMAP.md) deixou de ser cronograma e virou registro: o que foi construído, o que faltou, e a retrospectiva de por que parou — incluindo o erro central, que foi de premissa de negócio e não de execução técnica. Quem for ler um arquivo só, leia a seção **Por que parou**.

## Executar localmente

Instale as dependências com npm install e rode npm run dev. As áreas que dependem de autenticação, banco ou pagamentos exigem a configuração dos respectivos serviços externos. Não publique credenciais no repositório.

---

**English:** Malotex is a marketplace prototype for connecting travelers with people who need to send items along compatible routes. Development was wound down in October 2026 with the scope closed and documented; the connection fee was never charged once, and the roadmap now records what was built, what was missing, and a retrospective on why it stopped. [MALAH](https://github.com/Udavisouzaa/MALAH) was an early exploration of the same project; the technical repository name flydrop remains from a later branding stage. A reachable website does not verify end to end functionality or payment readiness.
