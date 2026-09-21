export const metadata = { title: "Privacidade — Pulso Fitness" };

export default function PrivacyPage() {
  return <main className="privacy-page">
    <div className="privacy-wrap">
      {/* A navegação completa evita o erro de hidratação do Link nesta prévia Vinext. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="privacy-back" href="/">← Voltar ao Pulso</a>
      <span className="eyebrow">TRANSPARÊNCIA</span>
      <h1>Como seus dados são usados</h1>
      <p className="privacy-lead">Esta é a versão de prévia do Pulso Fitness. O site foi feito para adultos organizarem treinos, refeições e hábitos, com controle dos próprios registros.</p>
      <section><h2>Dados guardados neste dispositivo</h2><p>Altura, peso, preferências, treinos concluídos, planos de refeição, registros de evolução, anotações e sessões de jejum são salvos no armazenamento deste navegador. O Pulso não cria uma conta nem sincroniza esses dados entre aparelhos. Eles podem desaparecer se você limpar os dados do navegador ou perder o dispositivo.</p></section>
      <section><h2>Backup e exclusão</h2><p>Na área <strong>Meus dados</strong>, você pode exportar um arquivo JSON, restaurar um backup e apagar os dados guardados neste navegador. O backup contém informações pessoais de rotina e saúde; guarde-o em um lugar seguro. Apagar os dados locais não apaga cópias que você tenha exportado.</p></section>
      <section><h2>Assistente e IA online</h2><p>O assistente funciona localmente por padrão. A IA online só é usada se houver uma chave configurada no servidor e você ativar a opção no Assistente. Nesse caso, são enviados à OpenAI a pergunta e um resumo com quantidade de registros, variação de peso, energia mais recente, treinos concluídos, dias de treino, objetivo e estilo alimentar. Notas livres e pesos exatos não são enviados nesse resumo. O servidor usa o endereço IP temporariamente para limitar pedidos e evitar abuso. A integração usa <code>store: false</code>, mas o provedor pode tratar dados conforme seus próprios controles e políticas. Você pode desligar a IA online a qualquer momento.</p><p><a href="https://developers.openai.com/api/docs/guides/your-data" target="_blank" rel="noreferrer">Leia os controles de dados da API da OpenAI ↗</a></p></section>
      <section><h2>Fontes e serviços externos</h2><p>As fontes da interface são servidas junto com o próprio site. O projeto não usa ferramentas próprias de anúncios ou análise de comportamento nesta prévia. A OpenAI só recebe a pergunta e o resumo descritos acima quando a IA online é ativada.</p></section>
      <section><h2>Finalidade e limites</h2><p>Os dados locais servem para mostrar seu histórico e adaptar sugestões dentro do próprio navegador. Quando a IA online é ativada, o resumo enviado serve apenas para responder à pergunta. As sugestões são gerais e não substituem atendimento médico, nutricional ou de educação física.</p></section>
      <section><h2>Responsável e contato</h2><p>O nome do responsável pelo site e um canal de contato serão inseridos antes da publicação. Esta prévia local ainda não está disponível ao público.</p></section>
      <p className="privacy-update">Atualizado em 20 de setembro de 2026.</p>
    </div>
  </main>;
}
