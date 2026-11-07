# Me ajuda! — controle financeiro pessoal

Aplicação React + Vite com armazenamento local no navegador.

## Executar localmente

1. Instale Node.js (versão LTS).
2. No terminal, dentro da pasta do projeto, execute:

   ```bash
   npm install
   npm run dev
   ```

3. Para gerar a versão de publicação:

   ```bash
   npm run build
   ```

   Os arquivos finais ficam na pasta `dist`.

## Dados e privacidade

- Os registros são salvos no `localStorage` deste navegador/dispositivo.
- Não há conta, servidor ou sincronização em nuvem.
- Use **Exportar backup** na tela inicial para salvar uma cópia JSON.
- **Restaurar backup** substitui os registros atuais pelos dados do arquivo escolhido.
- Limpar os dados do navegador, trocar de navegador ou dispositivo pode apagar/deixar inacessíveis os registros. Mantenha backups em local seguro.

## Limitações atuais

- O acompanhamento de crédito ainda soma os gastos de todos os cartões; compras não são atribuídas individualmente a cada cartão.
- Parcelamentos e geração automática de faturas ainda precisam ser implementados.
- Os lembretes e notificações automáticas ainda não estão implementados.
- A aplicação inclui lançamentos de demonstração na primeira abertura. Exclua-os e cadastre seus dados reais.

## PWA

O projeto inclui manifesto e service worker. Para instalar como aplicativo, publique em HTTPS e abra pelo navegador compatível. O funcionamento offline depende de os arquivos já terem sido carregados e armazenados em cache.

## Controle de gastos da casa
A aba **Casa** mantém despesas domésticas separadas dos lançamentos gerais. É possível registrar mercado, aluguel/financiamento, energia, água, gás, internet/telefone, limpeza, manutenção, móveis e outros gastos, com valor, data e observação. O resumo mensal é agrupado por categoria. Esses valores são armazenados localmente e incluídos nos backups JSON.
