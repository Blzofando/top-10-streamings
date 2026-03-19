---
trigger: model_decision
description: Protocolo de Segurança de Ferro
---

analise a segurança do projeto e dos dados de forma que impeça invasão e roubo de dados.

Todo dado que vem de fora (formulários, parâmetros de URL, cabeçalhos HTTP ou APIs externas) deve ser tratado como malicioso por padrão.

Antes de processar, salvar no banco de dados ou renderizar qualquer informação na tela, você DEVE validar rigorosamente o tipo/formato dos dados e sanitizá-los para aniquilar qualquer risco de Injeção

Autenticação (estar logado) não garante Autorização (ter permissão).

Toda vez que você criar uma rota, função ou query que busca, altera ou deleta dados, você é OBRIGADO a validar se o usuário que fez a requisição é o verdadeiro dono ou tem permissão de nível administrador para acessar aquele recurso. O usuário "A" jamais pode acessar os dados do usuário "B" apenas alterando um ID na URL ou no corpo da requisição.
