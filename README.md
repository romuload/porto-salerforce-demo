# Porto Salesforce Demo

Protótipo navegável de uma demonstração Salesforce (console de sinistros), construído a partir do Figma.

**No ar:** https://romuload.github.io/porto-salerforce-demo/

## Intro

Ao abrir, uma intro de 5 s (`intro.css` e `intro.js`, baseada no frame 2115:9134 do Figma PORTO - Handoff) pulsa os anéis, monta o logo Porto Seguro e avisa que todos os dados são fictícios. Pode ser pulada pelo botão, por clique ou Esc; com movimento reduzido aparece estática.

## Fluxo

1. **Dashboard**: Acompanhamento de Sinistros. O filtro de período muda todos os números.
2. **Lista**: clicar num dos 4 cards abre a lista de casos daquele status.
3. **Caso**: clicar numa linha abre o registro do caso.
4. **Análise**: "Analisar" abre o assistente em 4 passos (Aviso, Apólice, Resumo, Parecer). O número da apólice abre a sub-aba Extrato Utilização.

Dados fictícios. HTML, CSS e JavaScript puros, sem build. Responsivo de 320px a 1440px.

## Rodar localmente

```bash
python3 -m http.server 4190
```

Abra http://localhost:4190.
