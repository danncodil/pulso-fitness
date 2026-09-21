# Pulso Fitness

Site de planejamento fitness em português, criado como protótipo funcional para adultos. Inclui cálculo de IMC, treinos conforme dias, objetivo, tempo, local, equipamento e preferência, sugestões de refeições com filtros de ingredientes, temporizador e histórico de jejum, planejamento de refeição livre, registros e resumo de evolução e assistente de rotina.

A busca rápida abre pelo botão no topo ou com `Ctrl+K` (`⌘K` no Mac). Preferências, treinos concluídos e registros ficam salvos neste navegador. Em **Meus dados**, a pessoa pode exportar, restaurar e apagar os dados locais. O backup é um JSON com versão e validação; a restauração substitui os dados do navegador.

## Usar localmente

Requer Node.js 22.13 ou superior.

```bash
npm ci
npm run dev
```

Abra o endereço local exibido no terminal. Para criar uma versão de produção: `npm run build`.
Para verificar os fluxos centrais: `npm test` e `npm run lint`.

## IA online opcional

O assistente sempre funciona em modo local com respostas gerais. Para disponibilizar respostas de um modelo de IA, crie um arquivo `.env.local` a partir de `.env.example` e preencha `OPENAI_API_KEY`. A chave é usada somente no servidor pela rota `/api/coach`; não deve ser colocada no código do navegador. O modelo padrão é `gpt-4.1-mini`, configurável com `OPENAI_MODEL`.

Mesmo com a chave configurada, a IA online começa desligada para cada pessoa. Se ela ativar a opção no Assistente, são enviados a pergunta e um resumo limitado: número de registros, variação do peso, energia mais recente, treinos marcados, dias, objetivo e estilo alimentar. Notas livres e pesos exatos não entram no resumo. Sem a chave ou sem essa escolha, nenhum pedido é enviado à OpenAI. O servidor valida e limita os pedidos e usa `store: false`; o limite em memória é apenas uma primeira barreira, e uma publicação pública exige também limite no serviço de hospedagem.

## Privacidade e operação

O aviso em `/privacidade` explica o armazenamento local, o backup, a exclusão e o envio opcional à IA. As fontes são servidas pelo próprio site. A rota `/api/health` pode ser usada para uma verificação de disponibilidade depois da publicação.

Antes de publicar, preencher no aviso o nome e o contato real do responsável pelo site, revisar o texto com orientação jurídica, revisar sugestões de treino/alimentação/jejum com profissionais habilitados, configurar limites e monitoramento na hospedagem, testar a IA com uma chave real e validar a aplicação em dispositivos e leitores de tela reais. A publicação depende de autorização expressa do proprietário.

## Limites

As sugestões de treino, alimentação e jejum são gerais e não substituem profissionais de saúde. O IMC é uma medida de triagem para adultos, não um diagnóstico. Os filtros de ingredientes representam preferências e não garantem segurança para alergias. Sem conta, os dados não sincronizam entre aparelhos. O site não foi publicado.
