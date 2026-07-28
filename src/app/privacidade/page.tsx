import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/legal-shell";
import { DPO_EMAIL, SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade — LevAí",
  description:
    "Quais dados o LevAí trata, por quê, com quem compartilha e como você exerce seus direitos sob a LGPD.",
};

/**
 * Written to be *read*, not to be defensible in court and incomprehensible to a
 * user. LGPD Art. 9 requires clear, adequate and ostensive information about
 * the processing — a wall of legalese technically discloses and practically
 * hides, which is the failure mode this page is trying to avoid.
 *
 * Every claim here has to stay true to the code. If a new column, a new
 * processor or a new retention rule appears, this page changes in the same PR.
 */
export default function PrivacidadePage() {
  return (
    <LegalShell
      title="Política de Privacidade"
      intro="O que a gente sabe sobre você, por que sabe, e o que você pode fazer a respeito."
    >
      <LegalSection n={1} title="Quem é o controlador">
        <p>
          O <strong>LevAí</strong> é o controlador dos dados pessoais tratados neste
          aplicativo, nos termos da Lei nº 13.709/2018 (<strong>LGPD</strong>).
        </p>
        <p>
          Encarregado pelo tratamento de dados (DPO):{" "}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Que dados a gente trata">
        <p>
          <strong>Que você nos dá:</strong>
        </p>
        <LegalList
          items={[
            "Cadastro: nome completo, e-mail, telefone e senha (guardada apenas como hash, nunca em texto).",
            "Perfil: foto e uma bio curta, se você quiser preencher.",
            "Viagens: cidade de origem, cidade de destino, datas e espaço disponível na mala.",
            "Pedidos: o que você precisa, descrição, orçamento e cidades.",
            "Mensagens trocadas com a outra pessoa dentro do aplicativo.",
            "Avaliações que você escreve depois de uma entrega.",
          ]}
        />
        <p>
          <strong>Que o sistema gera:</strong>
        </p>
        <LegalList
          items={[
            "Identificador da sua conta, datas de criação e atualização dos registros.",
            "Histórico de matches, status de cada entrega e confirmações de retirada e entrega.",
            "Nota média e número de entregas concluídas — calculados automaticamente, não editáveis à mão.",
            "Registros de pagamento da taxa de conexão: valor, status, data e o identificador da cobrança no provedor.",
            "Registros de acesso (data, hora e endereço IP), gerados pela infraestrutura de hospedagem e guardados pelo prazo do art. 15 do Marco Civil da Internet.",
            "Aceite dos Termos: a versão aceita e o momento exato do aceite (art. 8º, §1º da LGPD).",
          ]}
        />
        <p>
          <strong>Que a gente não trata:</strong> não pedimos CPF, RG, nem documento de
          identidade. Não pedimos nem armazenamos dados de cartão de crédito — o pagamento da
          taxa é por Pix e acontece inteiramente no provedor de pagamento. Não usamos cookies
          de publicidade, não rastreamos você em outros sites e não fazemos perfilamento
          comportamental.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Por que a gente trata (base legal)">
        <LegalList
          items={[
            <>
              <strong>Execução do contrato</strong> (art. 7º, V): criar sua conta, publicar
              viagens e pedidos, formar matches, liberar o contato depois do pagamento e
              manter o histórico da entrega.
            </>,
            <>
              <strong>Consentimento</strong> (art. 7º, I): o aceite dos Termos e desta
              Política no cadastro, e a foto e a bio do perfil, que são opcionais. Você pode
              retirar o consentimento a qualquer momento — veja a seção 7.
            </>,
            <>
              <strong>Obrigação legal</strong> (art. 7º, II): guarda dos registros de acesso
              por 6 meses (Marco Civil, art. 15) e dos registros fiscais das cobranças pelo
              prazo que a legislação tributária exige.
            </>,
            <>
              <strong>Legítimo interesse</strong> (art. 7º, IX): segurança da plataforma —
              detectar fraude, abuso e uso automatizado, e aplicar limites de requisição. O
              tratamento aqui é o mínimo necessário para isso e nunca é usado para publicidade.
            </>,
            <>
              <strong>Exercício regular de direitos</strong> (art. 7º, VI): manter provas de
              uma transação em caso de disputa.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="O que fica visível para outras pessoas">
        <p>Isso importa mais do que qualquer outra coisa nesta página, então vai destacado:</p>
        <LegalList
          items={[
            <>
              <strong>Público para quem usa o app:</strong> seu nome, sua foto, sua bio, sua
              nota média, seu número de entregas concluídas e o conteúdo das viagens e pedidos
              que você publica.
            </>,
            <>
              <strong>Privado até o pagamento:</strong> seu telefone e seu e-mail. Eles só são
              revelados à outra parte <strong>depois</strong> que a taxa de conexão daquele
              match é confirmada. Antes disso, ninguém vê.
            </>,
            <>
              <strong>Nunca público:</strong> sua senha, seus registros de acesso e seus dados
              de pagamento.
            </>,
          ]}
        />
        <p>
          Não publique dado sensível nem número de documento na bio, no título do pedido ou
          nas mensagens. Esses campos são visíveis para outras pessoas.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Com quem a gente compartilha">
        <p>
          Não vendemos seus dados. Nunca. Compartilhamos apenas com os operadores necessários
          para o app funcionar:
        </p>
        <LegalList
          items={[
            <>
              <strong>Supabase</strong> — banco de dados e autenticação. Guarda cadastro,
              perfil, viagens, pedidos, matches e mensagens.
            </>,
            <>
              <strong>Vercel</strong> — hospedagem e entrega das páginas. Processa registros
              técnicos de acesso.
            </>,
            <>
              <strong>Asaas</strong> — cobrança da taxa de conexão por Pix. Recebe o mínimo
              necessário para emitir a cobrança e nos devolve apenas o status dela.
            </>,
            <>
              <strong>Autoridades</strong> — mediante ordem judicial ou requisição legal
              válida. Nesse caso avisamos você, salvo quando a lei proibir o aviso.
            </>,
          ]}
        />
        <p>
          <strong>Transferência internacional:</strong> parte dessa infraestrutura fica fora do
          Brasil. A transferência é feita com base no art. 33, II e IX da LGPD, sob cláusulas
          contratuais que exigem do operador padrão de proteção equivalente ao brasileiro.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Por quanto tempo a gente guarda">
        <LegalList
          items={[
            "Conta ativa: enquanto ela existir.",
            <>
              <strong>Quando você exclui a conta: a exclusão é imediata e
              definitiva.</strong> Perfil, viagens, pedidos, matches, mensagens e
              avaliações são apagados na hora. Não há período de carência nem
              cópia de segurança que a gente reative depois.
            </>,
            "Registros de acesso: mantidos pela infraestrutura de hospedagem pelo prazo do art. 15 do Marco Civil.",
            "Comprovantes fiscais das cobranças: ficam com o provedor de pagamento (Asaas), que é quem emite a cobrança e responde pela guarda fiscal dela.",
          ]}
        />
        <p>
          Como a exclusão não tem volta, baixe uma cópia dos seus dados antes, se
          quiser guardar o histórico.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Seus direitos (art. 18 da LGPD)">
        <p>Você pode, a qualquer momento e sem custo:</p>
        <LegalList
          items={[
            "Confirmar que existe tratamento e acessar seus dados.",
            "Corrigir dado incompleto, inexato ou desatualizado.",
            "Pedir anonimização, bloqueio ou eliminação de dado desnecessário ou excessivo.",
            "Levar seus dados para outro serviço (portabilidade), em formato legível por máquina.",
            "Eliminar dados tratados com base no consentimento.",
            "Saber com quem compartilhamos seus dados.",
            "Saber o que acontece se você negar consentimento.",
            "Revogar o consentimento.",
          ]}
        />
        <p>
          Boa parte disso você resolve sozinho, na hora, sem falar com ninguém:{" "}
          <Link href="/privacidade/meus-dados">Meus dados</Link> — baixe uma cópia completa do
          que temos sobre você ou exclua sua conta.
        </p>
        <p>
          Para o resto, escreva para <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>.
          Respondemos em até 15 dias.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Como a gente protege">
        <LegalList
          items={[
            "Todo o tráfego é criptografado em trânsito (HTTPS obrigatório).",
            "Senhas são guardadas apenas como hash — ninguém no LevAí consegue ler a sua.",
            "O banco usa isolamento por linha: cada consulta só enxerga o que aquele usuário pode ver.",
            "Contato de terceiros é liberado pelo servidor, nunca pelo navegador — não dá para revelar um telefone mexendo no front-end.",
            "Limites de requisição em login, cadastro, pagamento e exportação, contra força bruta e abuso.",
            "Cabeçalhos de segurança que bloqueiam script de origem externa, incorporação em iframe e envio de formulário para fora do domínio.",
          ]}
        />
        <p>
          Nenhum sistema é infalível. Se acontecer um incidente com risco relevante a você,
          avisamos você e a ANPD nos prazos da LGPD (art. 48).
        </p>
      </LegalSection>

      <LegalSection n={9} title="Menores de idade">
        <p>
          O LevAí é para maiores de 18 anos. Não tratamos dados de crianças e adolescentes
          conscientemente. Se descobrirmos uma conta nessa situação, ela é removida. Se você é
          responsável e identificou uma, fale com a gente que agimos na hora.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Mudanças e contato">
        <p>
          Se esta Política mudar de forma relevante, avisamos no aplicativo antes de a mudança
          valer. A data da última atualização fica sempre no topo desta página.
        </p>
        <p>
          Dúvida, reclamação ou pedido:{" "}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a> ou WhatsApp{" "}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {SUPPORT_WHATSAPP_DISPLAY}
          </a>
          .
        </p>
        <p>
          Você também pode reclamar diretamente à <strong>ANPD</strong> — Autoridade Nacional
          de Proteção de Dados,{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
            gov.br/anpd
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
