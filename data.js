// Dados fictícios da demonstração. "mes-atual" reproduz os números do Figma.
window.DEMO_DATA = {
  periods: [
    { id: 'mes-atual', label: 'Mês atual' },
    { id: 'ultimos-7', label: 'Últimos 7 dias' },
    { id: 'mes-anterior', label: 'Mês anterior' },
    { id: 'trimestre', label: 'Este trimestre' }
  ],
  byPeriod: {
    'mes-atual': {
      kpis: { aguardando: 5, documentacao: 1, execucao: 6, encerrados: 2 },
      lesao: [22, 45, 5],
      empresa: [12, 17, 7, 8],
      sac: 4,
      casos: [5, 6, 3, 3, 11, 4, 7, 2, 3]
    },
    'ultimos-7': {
      kpis: { aguardando: 2, documentacao: 0, execucao: 3, encerrados: 1 },
      lesao: [8, 12, 1],
      empresa: [5, 8, 3, 5],
      sac: 9,
      casos: [2, 3, 1, 0, 4, 2, 3, 0, 1]
    },
    'mes-anterior': {
      kpis: { aguardando: 7, documentacao: 3, execucao: 4, encerrados: 9 },
      lesao: [30, 38, 7],
      empresa: [15, 20, 10, 9],
      sac: 17,
      casos: [7, 4, 2, 5, 9, 6, 8, 3, 9]
    },
    'trimestre': {
      kpis: { aguardando: 14, documentacao: 6, execucao: 13, encerrados: 21 },
      lesao: [74, 120, 15],
      empresa: [40, 52, 25, 27],
      sac: 24,
      casos: [14, 13, 7, 10, 28, 12, 13, 6, 21]
    }
  },
  lesaoLabels: ['Leve', 'Grave', 'Morte'],
  empresaLabels: ['Porto', 'Azul', 'Mitsui', 'Itaú'],
  // List views opened from the KPI cards. `kpi` is the key in byPeriod[...].kpis.
  listViews: [
    { id: 'aguardando-analise', label: 'Aguardando Análise', status: 'Aguardando Análise', kpi: 'aguardando' },
    { id: 'documentacao-recebida', label: 'Documentação Recebida', status: 'Documentação Recebida', kpi: 'documentacao' },
    { id: 'analise-em-execucao', label: 'Análise em execução', status: 'Análise em Execução', kpi: 'execucao' },
    { id: 'encerrados', label: 'Encerrados', status: 'Encerrado', kpi: 'encerrados' }
  ],
  // Rows from the Figma frame (Aguardando Análise, mês atual).
  figmaRows: [
    { prioridade: 'Alta', empresa: 'Porto seguro', nome: 'Mira Siphron' },
    { prioridade: 'Alta', empresa: 'Azul Seguros', nome: 'Lincoln Rosser' },
    { prioridade: 'Baixa', empresa: 'Porto seguro', nome: 'Lincoln Herwitz' },
    { prioridade: 'Baixa', empresa: 'Mitsui', nome: 'Lindsey Arcand' },
    { prioridade: 'Alta', empresa: 'Porto seguro', nome: 'Skylar Dias' }
  ],
  pools: {
    nomes: ['Ana Ribeiro', 'Bruno Carvalho', 'Carla Mendes', 'Diego Fonseca', 'Elisa Prado', 'Felipe Nunes',
      'Gabriela Lopes', 'Henrique Souza', 'Isabela Rocha', 'João Martins', 'Karina Alves', 'Lucas Teixeira',
      'Marina Costa', 'Nicolas Barros', 'Olívia Pires', 'Paulo Azevedo', 'Renata Dias', 'Sérgio Lima',
      'Tatiana Moraes', 'Vinícius Freitas'],
    empresas: ['Porto seguro', 'Azul Seguros', 'Mitsui', 'Itaú'],
    prioridades: ['Alta', 'Média', 'Baixa'],
    naturezas: ['Colisão', 'Colisão', 'Atropelamento', 'Queda de moto']
  },
  casosLabels: [
    'Aguardando Análise', 'Análise em Execução', 'Em sindicância',
    'Encerrados por Recusa', 'Liberado para Regulação', 'Regulação Interna',
    'Solicitado Documentação', 'Documentação Recebida', 'Encerrado'
  ]
};
