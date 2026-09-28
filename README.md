# Presença Igreja — PWA

Versão inicial pronta para testes.

## O que já funciona

- Cadastro de membros.
- Cadastro de cultos.
- Culto ativo.
- Leitura de QR Code pela câmera.
- Registro de presença.
- Bloqueio de presença duplicada no mesmo culto.
- QR desconhecido pode ser cadastrado na hora.
- Relatório de presentes e faltantes.
- Importação simples de CSV.
- PWA instalável.
- Exemplo já cadastrado com o QR Code fornecido na conversa.

## QR de exemplo

O membro "Membro exemplo" foi criado usando:

https://igreja.digital/web?MHB3Tkp0Qkh1SWxNcXJKNTltVVJBUT09

## Como testar

1. Abra a pasta no VS Code.
2. Rode com uma extensão como Live Server ou publique no GitHub Pages.
3. Abra no celular.
4. Entre em "Cultos".
5. O "Culto de teste" já estará aberto.
6. Abra "QR".
7. Permita acesso à câmera.
8. Aponte para o QR de exemplo.
9. A presença aparecerá como "Membro exemplo".

Também existe um campo "Teste sem câmera", onde você pode colar o conteúdo do QR.

## Importante sobre esta primeira versão

Os dados são salvos no navegador (localStorage). Portanto, é uma versão totalmente funcional para começar, mas os dados não são compartilhados entre aparelhos.

A próxima etapa pode trocar o armazenamento local pelo Firebase Firestore, mantendo praticamente a mesma interface. Isso permitirá que os membros/cultos/presenças fiquem na nuvem e sejam acessados por mais de um dispositivo.

## CSV

Para importar, use:

nome,qr

Exemplo:

João da Silva,https://exemplo.com/qr/123
Maria Santos,https://exemplo.com/qr/456

## Identidade visual
A interface foi ajustada para usar preto e azul-marinho como base, com uma faixa de acentos inspirada nas cores do arco-íris presentes na identidade visual da IPDA: vermelho, laranja, amarelo, verde e azul. A referência visual foi conferida no site da IPDA e em versões públicas do logotipo.
