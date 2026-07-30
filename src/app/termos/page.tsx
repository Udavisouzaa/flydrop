import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection, LegalList } from "@/components/legal-shell";
import { DPO_EMAIL, SUPPORT_WHATSAPP, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso — Malotex",
  description:
    "As regras de uso do Malotex: o que a plataforma faz, o que não faz, e de quem é cada responsabilidade.",
};

/**
 * Static by design — no cookies, no session read, nothing per-request. It has
 * to be readable by someone who does not have an account yet, because the
 * signup checkbox links here before the account exists.
 */
export default function TermosPage() {
  return (
    <LegalShell
      title="Termos de Uso"
      intro="Leia com atenção: ao criar uma conta você concorda com tudo o que está aqui."
    >
      <LegalSection n={1} title="Quem somos e o que fazemos">
        <p>
          O <strong>Malotex</strong> é uma plataforma de intermediação. Colocamos em contato
          duas pessoas: alguém que vai viajar e tem espaço sobrando na mala, e alguém que
          precisa de um produto de outra cidade.
        </p>
        <p>
          <strong>Não somos transportadora, não somos loja e não somos correio.</strong> Não
          compramos, não vendemos, não embalamos, não transportamos e não seguramos nenhum
          produto. Não temos custódia da encomenda em momento algum.
        </p>
      </LegalSection>

      <LegalSection n={2} title="O que você paga, e só isso">
        <p>
          A única cobrança do Malotex é a <strong>taxa de conexão</strong>: um valor único, pago
          uma vez por match aceito, que libera o contato entre as duas pessoas.
        </p>
        <LegalList
          items={[
            <>
              Ela equivale a <strong>10% do orçamento do pedido</strong>, limitada a no mínimo
              R$&nbsp;4,90 e no máximo R$&nbsp;29,90.
            </>,
            <>
              Se o pedido não tiver orçamento informado, o valor é de R$&nbsp;9,90.
            </>,
            <>
              O valor é calculado <strong>no servidor</strong>, a partir do pedido. Ele é
              mostrado antes do pagamento e não muda depois que o match é aceito.
            </>,
          ]}
        />
        <p>
          <strong>O preço do produto e qualquer valor pelo frete são acertados diretamente
          entre vocês dois, fora do aplicativo.</strong> O Malotex não recebe, não guarda, não
          repassa e não garante esse dinheiro. Não há caução, custódia ou intermediação
          financeira da entrega.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Cancelamento e reembolso">
        <LegalList
          items={[
            <>
              <strong>Arrependimento (art. 49 do CDC):</strong> você pode desistir da taxa de
              conexão em até <strong>7 dias corridos</strong> do pagamento e receber o valor
              integral de volta, sem precisar justificar. Basta pedir pelos canais da
              seção&nbsp;10.
            </>,
            <>
              <strong>Falha nossa:</strong> se o pagamento foi confirmado e o contato não foi
              liberado, devolvemos 100% do valor.
            </>,
            <>
              <strong>Depois dos 7 dias:</strong> a taxa remunera um serviço já prestado (a
              conexão foi feita, o contato foi entregue) e não é reembolsável — mesmo que
              vocês desistam da entrega depois.
            </>,
          ]}
        />
        <p>
          Reembolsos voltam pelo mesmo meio do pagamento, em até 10 dias úteis do aceite do
          pedido.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Quem responde pelo quê">
        <p>
          Depois que o contato é liberado, o combinado é entre vocês. Isso significa que a
          responsabilidade pelo produto, pelo pagamento dele e pela entrega é{" "}
          <strong>exclusivamente das duas pessoas envolvidas</strong>.
        </p>
        <p>O Malotex não responde por:</p>
        <LegalList
          items={[
            "Produto errado, avariado, faltando, falsificado ou fora da descrição.",
            "Atraso, extravio, perda, furto ou apreensão da encomenda.",
            "Não pagamento do produto ou do frete combinado entre as partes.",
            "Qualquer acordo, promessa ou condição feita fora da plataforma.",
          ]}
        />
        <p>
          Nossa responsabilidade, quando houver, está limitada ao valor da taxa de conexão
          efetivamente paga naquele match. Isso não afasta os direitos que a lei brasileira
          garante a você de forma inafastável.
        </p>
      </LegalSection>

      <LegalSection n={5} title="O que não pode ser levado">
        <p>
          É <strong>proibido</strong> usar o Malotex para combinar o transporte de:
        </p>
        <LegalList
          items={[
            "Armas, munições, explosivos, fogos de artifício e materiais inflamáveis ou corrosivos.",
            "Drogas, entorpecentes, medicamentos controlados sem receita e produtos de uso restrito.",
            "Dinheiro em espécie, joias, metais preciosos, cheques e títulos ao portador.",
            "Animais vivos, restos biológicos e alimentos perecíveis sem refrigeração.",
            "Produtos falsificados, contrabandeados, roubados ou de origem ilícita.",
            "Baterias de lítio soltas, aerossóis e qualquer item que a ANAC ou a companhia aérea proíba no voo escolhido.",
            "Qualquer coisa cuja posse ou circulação seja crime.",
          ]}
        />
        <p>
          <strong>Quem viaja é responsável pela própria bagagem perante a companhia aérea, a
          ANAC, a Receita Federal e a polícia.</strong> Confira o conteúdo antes de aceitar.
          Nunca aceite volume lacrado sem ver o que tem dentro.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Sua conta">
        <LegalList
          items={[
            "Você precisa ter 18 anos ou mais e capacidade civil plena.",
            "Os dados que você informa têm que ser verdadeiros e seus. Contas com identidade falsa são removidas.",
            "A senha é sua responsabilidade. Não compartilhe. Se suspeitar de acesso indevido, troque na hora e fale com a gente.",
            "Uma pessoa, uma conta.",
          ]}
        />
      </LegalSection>

      <LegalSection n={7} title="Conduta">
        <p>Não é permitido:</p>
        <LegalList
          items={[
            "Combinar a entrega fora da plataforma só para não pagar a taxa de conexão.",
            "Assediar, ameaçar, discriminar ou expor outra pessoa.",
            "Publicar anúncio falso, enganoso ou de produto que você não pretende entregar.",
            "Raspar dados, automatizar acessos, testar falhas ou tentar burlar limites da plataforma.",
            "Usar o Malotex para qualquer atividade ilegal.",
          ]}
        />
        <p>
          Podemos suspender ou encerrar contas que violem estes Termos, com aviso sempre que
          possível e imediatamente quando houver risco a outras pessoas.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Avaliações e reputação">
        <p>
          Depois de uma entrega concluída, as duas partes podem se avaliar. As notas e os
          contadores de entregas concluídas são <strong>calculados pelo sistema</strong> a
          partir de fatos registrados — não podem ser editados manualmente por ninguém, nem
          por você, nem por nós.
        </p>
        <p>
          Avaliações com ofensa, dado pessoal de terceiro ou conteúdo ilícito são removidas.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Seus dados">
        <p>
          O tratamento dos seus dados pessoais está descrito na{" "}
          <Link href="/privacidade">Política de Privacidade</Link>, que faz parte destes
          Termos.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Mudanças, contato e foro">
        <p>
          Podemos atualizar estes Termos. Mudanças relevantes são avisadas no aplicativo antes
          de valer, e a data da última atualização fica sempre no topo desta página. Continuar
          usando o Malotex depois disso significa concordar com a nova versão.
        </p>
        <p>
          Fala com a gente:{" "}
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
          Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do
          consumidor para resolver qualquer questão que não der para resolver conversando.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
