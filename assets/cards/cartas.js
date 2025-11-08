// Arquivo central de cartas para Mytragor
// Adicione novas cartas neste array!

const CARD_DEFS = [
  // --- Escolhidos / Líderes ---
  {
    name: 'Valbrak, Heroi do Povo',
    key: 'valbrak',
    kind: 'leader',
    img: 'assets/chosens/valbrak.png',
    filiacao: 'Arcana',
    ac: 10,
    hp: 20,
    maxHp: 20,
    damage: 2,
    atkBonus: 2,
    text: 'Valbrak, o Arcano. Um Escolhido com afinidade Arcana.'
  },
  {
    name: 'Katsu, o Vingador',
    key: 'katsu',
    kind: 'leader',
    img: 'assets/chosens/katsu.png',
    filiacao: 'Marcial',
    ac: 12,
    hp: 20,
    maxHp: 20,
    damage: 4,
    atkBonus: 4,
    text: 'Katsu, o Marcial. Um Escolhido focado em combate corpo-a-corpo.'
  },
  {
    name: 'Leafae, Guardião da Floresta',
    key: 'leafae',
    kind: 'leader',
    img: 'assets/chosens/leafae.png',
    filiacao: 'Religioso',
    ac: 10,
    hp: 20,
    maxHp: 20,
    damage: 1,
    atkBonus: 2,
    effect: 'leafae',
    text: 'Leafae: sempre que outro aliado for curado, Leafae ganha permanentemente +1 ATK, +1 Dano e +1 AC.'
  },
  {
    name: 'Ademais, Aranha Negra',
    key: 'ademais',
    kind: 'leader',
    img: 'assets/chosens/ademais.png',
    filiacao: 'Sombras',
    ac: 10,
    hp: 20,
    maxHp: 20,
    damage: 2,
    atkBonus: 2,
    text: 'Ademais — líder associado às Aranhas Negras; ganha bônus por cartas "Aranhas" em campo.'
  },
    // Nota: recebeu stats padrão para ser alvo de ataques/efeitos.
  // Exemplos de outras cartas (adicione todas as cartas reais aqui)
  {
  name: 'Cervo de Galhos Brancos', kind: 'ally', img: 'assets/allies/cervo_ga_brancos.png', cost: 3, classe: 'Criatura', tipo: 'Animal', filiacao: 'Religioso', ac: 6, hp: 3, maxHp: 3, damage: 2, atkBonus: 1, keywords: [], effect: 'curar_animal', effectValue: 1, text: 'Ao entrar em campo, cura 1 de vida de um aliado do tipo Animal.'
  },
{
  name: 'Cão de Caça Feroz', kind: 'ally', img: 'assets/allies/cao_caca_feroz.png', cost: 2, classe: 'Criatura', tipo: 'Animal', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 4, atkBonus: 2, keywords: ['precisão'], text: 'Possui precisão: rola 2d20 e usa o maior para atacar.'
},
  {
   name: 'Jabuti Barreira', kind: 'ally', img: 'assets/allies/jabuti_barreira.png', cost: 4, classe: 'Criatura', tipo: 'Animal', filiacao: 'Religioso', ac: 9, hp: 8, maxHp: 8, damage: 1, atkBonus: 0, keywords: ['bloquear'], text: 'Bloquear'
  },
  // Carta de teste: Aranhas Negras (aliado de teste)
  {
    name: 'Aranhas Negras, Agiota', kind: 'ally', img: 'assets/allies/aranhas_agiota.png', cost: 2, classe: 'Ladino', tipo: 'Humano', filiacao: 'Neutra', ac: 5, hp: 3, maxHp: 3, damage: 1, atkBonus: 1, keywords: [], effect: 'agiota', text: 'Uma vez por turno: você pode jogar uma carta que custa 3 fragmentos ou menos pagando 2 de vida desta carta em vez do custo em fragmentos.'
  },
  {
    name: 'Aranhas Negras, Novato', kind: 'ally', img: 'assets/allies/aranhas_novato.png', cost: 1, classe: 'ladino', tipo: 'Humano', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 1, atkBonus: 1, keywords: [], text: 'Aranhas Negras, Novato'
  },
  {
    name: 'Aranhas Negras, Mascote', kind: 'ally', img: 'assets/allies/aranhas_mascote.png', cost: 7, classe: 'Criatura', tipo: 'Animal', filiacao: 'Sombras', ac: 10, hp: 4, maxHp: 4, damage: 2, atkBonus: 2, keywords: [], effect: 'aranhas_mascote', text: 'Ao entrar em campo: crie fichas de Aranhas Negras em todos os slots vazios.'
  },
  {
    name: 'Gladiador Aposentado', kind: 'ally', img: 'assets/allies/gladiador_aposentado.png', cost: 7, classe: 'Cidadão', tipo: 'Humano', filiacao: 'Neutra', ac: 6, hp: 8, maxHp: 8, damage: 6, atkBonus: 7, keywords: ['precisão'], text: 'Gladiador Aposentado'
  },
  {
    name: 'Aranhas Negras, Executor', kind: 'ally', img: 'assets/allies/aranhas_executor.png', cost: 4, classe: 'Ladino', tipo: 'Humano', filiacao: 'Sombras', ac: 11, hp: 5, maxHp: 5, damage: 3, atkBonus: 3, keywords: [],
    // Ao entrar, permite banir uma carta; também fornece aura de +1 ATK a aliados com "Aranhas Negras" no nome
    effect: 'ban_on_enter', effectValue: 1, auraTarget: { nameIncludes: 'Aranhas Negras' }, auraScope: 'allies', auraProp: 'atk', text: 'Todos os seus aliados com "Aranhas Negras" no nome ganham +1 de bônus de ataque. Ao entrar em campo, você pode banir uma carta.'
  },
  {
    name: 'Goblin Sabotador', kind: 'ally', img: 'assets/allies/goblin_sabotador.png', cost: 3, classe: 'Criatura', tipo: 'Humanoide', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 1, atkBonus: 1, keywords: [], effect: 'destroy_equip_on_enter', text: 'Ao entrar em campo, destrua um equipamento em campo.'
  },
  {
  name: 'Thron, o Martelo da Montanha', kind: 'ally', img: 'assets/allies/thor_martelo_montanha.png', cost: 5, classe: 'Guerreiro', tipo: 'Anão', filiacao: 'Neutra', ac: 8, hp: 6, maxHp: 6, damage: 4, atkBonus: 4, keywords: ['atropelar'], effect: '', text: 'Atropelar'
  },
  {
    name: 'Ogro da Montanha', kind: 'ally', img: 'assets/allies/ogro_montanha.png', cost: 6, classe: 'Criatura', tipo: 'Humanoide', filiacao: 'Neutra', ac: 7, hp: 6, maxHp: 6, damage: 5, atkBonus: 3, keywords: ['atropelar'], effect: '', text: 'Atropelar'
 },
 {
   name: 'Urso Negro Tanque', kind: 'ally', img: 'assets/allies/urso_N_tanque.png', cost: 5, classe: 'Criatura', tipo: 'Animal', filiacao: 'Neutra', ac: 11, hp: 7, maxHp: 7, damage: 5, atkBonus: 5, keywords: [], effect: '', text: ''
 },
  {
  name: 'Bartolomeu, o Inspirador', kind: 'ally', img: 'assets/allies/bartolomeu_inspirador.png', cost: 4, classe: 'Cidadão', tipo: 'Humano', filiacao: 'Arcana', ac: 8, hp: 5, maxHp: 5, damage: 3, atkBonus: 3, keywords: [], effect: 'chamar_cidadao', text: 'Chamar Especial: invoca Cidadão da mão ao ser destruído.', chamarEspecial: { classe: 'Cidadão', origem: ['hand'] }
  },
  {
    name: 'Batedor Kobolt', kind: 'ally', img: 'assets/allies/batedor_kobolt.png', cost: 1, classe: 'Criatura', tipo: 'Humanoide', filiacao: 'Sombras', ac: 10, hp: 3, maxHp: 3, damage: 2, atkBonus: 3, keywords: [], effect: '', text: ''
  },
  {
  name: 'Estudante de Magia', kind: 'ally', img: 'assets/allies/estudante_magia.png', cost: 1, classe: 'Cidadão', tipo: 'Humano', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 1, atkBonus: 0, keywords: [], text: ''
  },
  {
  name: 'Gladiador Impenetrável', kind: 'ally', img: 'assets/allies/gladiador_impenetravel.png', cost: 4, classe: 'Guerreiro', tipo: 'Humano', filiacao: 'Neutra', ac: 8, hp: 8, maxHp: 8, damage: 2, atkBonus: 2, keywords: ['bloquear', 'provocar'], text: ''
  },
  {
  name: 'Gladiador Ousado', kind: 'ally', img: 'assets/allies/gladiador_ousado.png', cost: 4, classe: 'Guerreiro', tipo: 'Humano', filiacao: 'Neutra', ac: 8, hp: 6, maxHp: 6, damage: 3, atkBonus: 3, keywords: ['provocar'], text: ''
  },
  {
name: 'Tamanduá Guardião', kind: 'ally', img: 'assets/allies/tamandua_guardiao.png', cost: 4, classe: 'Criatura', tipo: 'Animal', filiacao: 'Religioso', ac: 10, hp: 6, maxHp: 6, damage: 1, atkBonus: 1, keywords: ['provocar'], effect: '', text: ''
  },
  {
  name: 'Aerin Nieloy', kind: 'ally', img: 'assets/allies/Aerin_Nieloy.png', cost: 3, classe: 'Guerreiro', tipo: 'Elfo', filiacao: 'Marcial', ac: 9, hp: 4, maxHp: 4, damage: 2, atkBonus: 2, keywords: ['bloquear'],
    effect: 'aura_hp', effectValue: 1, auraTarget: { classe: 'Cidadão' }, auraScope: 'allies',
    text: 'Enquanto este aliado estiver em campo, personagens da classe Cidadão recebem +1 de vida.'
  },

  {
  name: 'Informante do Beco', kind: 'ally', img: 'assets/allies/informante_beco.png', cost: 2, classe: 'Cidadão', tipo: 'Elfo', filiacao: 'Neutra', ac: 5, hp: 2, maxHp: 2, damage: 2, atkBonus: 2, keywords: [], effect: 'olhar_topo',text: 'Quando entra no campo, revela a carta do topo do seu deck, coloque-a no fundo ou no topo'
  },
  {
    name: 'Gamboa, Arqueira da Selva',
    kind: 'ally',
    img: 'assets/allies/gamboa_selva.png',
    cost: 4,
    classe: 'Ladino',
    tipo: 'Elfo',
    filiacao: 'Neutra',
    ac: 8,
    hp: 5,
    maxHp: 5,
    damage: 3,
    atkBonus: 3,
    keywords: [],
    effect: 'discard_enemy_hand',
    text: 'Ao entrar em campo, você pode olhar a mão do seu oponente. Escolha uma carta na mão dele e descarte.'
  },
  {
  name: 'Miliciano da Vila', kind: 'ally', img: 'assets/allies/miliciano_vila.png', cost: 2, classe: 'Cidadão', tipo: 'Humano', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 2, atkBonus: 2, keywords: [], text: ''
  },
{
  name: 'Toupeira Escavadora', kind: 'ally', img: 'assets/allies/toupeira_escavadora.png', cost: 1, classe: 'Criatura', tipo: 'Animal', filiacao: 'Neutra', ac: 5, hp: 1, maxHp: 1, damage: 1, atkBonus: 1, keywords: [], effect: 'olhar_topo', text: 'Ao entrar em campo, olhe a carta do topo do seu baralho. Você pode colocá-la no topo ou no fundo.'
},
  {
    name: 'Porco Espinho Furioso', kind: 'ally', img: 'assets/allies/Porco_e_furioso.png', cost: 3, classe: 'Criatura', tipo: 'Animal', filiacao: 'Religioso', ac: 5, hp: 1, maxHp: 1, damage: 1, atkBonus: 0, keywords: [], effect: 'ally_heal_buff', text: 'Sempre que um aliado do seu lado do campo for curado, esta carta ganha permanentemente +1 de ATK, +1 de Dano, +1 de AC e +1 de HP.'
  },
  {
    name: 'Hiena Carniceira', kind: 'ally', img: 'assets/allies/hiena_carniceira.png', cost: 3, classe: 'Criatura', tipo: 'Animal', filiacao: 'Neutra', ac: 5, hp: 4, maxHp: 4, damage: 2, atkBonus: 2, keywords: [],
    text: 'Quando este aliado for do campo para o cemitério, escolha um aliado no seu cemitério com custo 4 ou menos e chame-o para o campo.',
    // Configuração para o mecanismo genérico de "chamar especial" usado por outras cartas
    chamarEspecial: { origem: ['grave'], maxCost: 4 }
  },
  {
    name: 'Arnold, o Escudeiro', kind: 'ally', img: 'assets/allies/arnold_escudeiro.png',
    cost: 1,
    classe: 'Cidadão', tipo: 'Humano', filiacao: 'Marcial',
    ac: 6, hp: 4, maxHp: 4, damage: 1, atkBonus: 0,
    keywords: [], effect: 'search_deck', query: { kind: 'equip' }, max: 12,
    text: 'Ao entrar em campo, escolha um equipamento no seu baralho e adicione à sua mão.'
  },
  {
    name: 'O Protetor', kind: 'ally', img: 'assets/allies/o_protetor.png', cost: 3, classe: 'Cidadão', tipo: 'Humano', filiacao: 'Arcana', ac: 7, hp: 4, maxHp: 4, damage: 1, atkBonus: 1, keywords: ['bloquear'], effect: 'aura_hp', effectValue: 1, auraTarget: { classe: 'Cidadão' }, auraScope: 'allies', text: 'Enquanto este aliado estiver em campo, aliados da Classe Cidadão recebem +1 de vida.'
  },
  {
    name: 'Gladiador Veloz', kind: 'ally', img: 'assets/allies/gladiador_veloz.png', cost: 3, classe: 'Guerreiro', tipo: 'Humano', filiacao: 'Neutra', ac: 11, hp: 3, maxHp: 3, damage: 3, atkBonus: 4, keywords: [], text: ''
  },

  // Magias, Equipamentos, Ambientes, Truques
  {
  name: 'Mãos Flamejantes', kind: 'spell', img: 'assets/spell/Maos_flamejantes.png', cost: 2, classe: '', tipo: 'Magia', filiacao: 'Arcana', effect: 'dano_2_inimigo', text: 'Cause 2 de dano a um inimigo.'
  },
  {
    name: 'Espionagem Sorrateira', kind: 'spell', img: 'assets/spell/espionagem_sorrateira.png', cost: 4, classe: '', tipo: 'Magia', filiacao: 'Sombras', effect: 'espionagem_sorrateira',
    text: 'Olhe a mão do seu oponente. Descarte uma carta de filiação Religiosa, Marcial ou Arcana se houver.'
  },
  {
    name: 'Raio de Gelo', kind: 'spell', img: 'assets/spell/raio_gelo.png', cost: 1, classe: '', tipo: 'Magia', filiacao: 'Neutra', effect: 'raio_gelo',
    text: 'Deite um inimigo.'
  },
  {
    name: 'Ajuda do Povo', kind: 'spell', img: 'assets/spell/ajuda_povo.png', cost: 3, classe: '', tipo: 'Magia', filiacao: 'Arcana', effect: 'ajuda_do_povo',
    text: 'Crie duas fichas de aliado "Cidadãos Unidos" (classe: Cidadão, tipo: Humano, +2 ATK, +2 Dano, CA 5, HP 2). Se não houver espaço suficiente, crie o máximo possível (1 ou 0).'
  },
    {
      name: 'Contrição',
      kind: 'truque',
      img: 'assets/trick/contricao.png',
      cost: 4,
      classe: '',
      tipo: 'Truque',
      filiacao: 'Religioso',
      effect: 'freeser',
      text: 'Quando um inimigo declarar um ataque: negue aquele ataque. O inimigo não levanta no início do próximo turno do oponente.'
    },
    {
      name: 'Aranhas Negras, Emboscada',
      kind: 'truque',
      img: 'assets/trick/aranhas_emboscada.png',
      cost: 1,
      classe: '',
      tipo: 'Truque',
      filiacao: 'Sombras',
      effect: 'aranhas_emboscada',
      text: 'Ativação — Quando um personagem do oponente declarar um ataque: o atacante recebe −3 de bônus de ataque até o fim da batalha. Se você controlar um aliado com "Aranhas Negras" no nome, compre 1 carta.'
    },
  {
    name: 'Conversa Fiada', kind: 'truque', img: 'assets/trick/conversa_fiada.png', cost: 1, classe: '', tipo: 'Truque', filiacao: 'Arcana', effect: 'anular_magia_truque', text: 'Quando o oponente ativa uma magia ou truque, anule o efeito.'
  },
    {
      name: 'Bem Treinado',
      kind: 'truque',
      img: 'assets/trick/bem_treinado.png',
      cost: 2,
      classe: '',
      tipo: 'Truque',
      filiacao: 'Marcial',
      effect: 'bem_treinado',
      text: 'Ativação — Quando um aliado do seu lado do campo for enviado ao cemitério: escolha um aliado de filiação Marcial no seu cemitério e chame-o especial para o campo.'
    },
  {
    name: 'Tempestade Arcana', kind: 'env', img: 'assets/envs/tempestade_arcana.png', cost: 3, classe: '', tipo: 'Ambiente', filiacao: 'Arcana', effect: 'arcana_draw', text: 'Compre 1 carta extra no início do turno se o Escolhido for Arcano.'
  },
  {
    name: 'Caminho das Sombras', kind: 'env', img: 'assets/envs/caminho_sombras.png', cost: 3, classe: '', tipo: 'Ambiente', filiacao: 'Sombras', effect: 'sombra_penalty', text: 'Jogadores não-Sombra têm -1 ação no turno.'
  },
  {
    name: 'Campos Ensanguentados', kind: 'env', img: 'assets/envs/campos_ensanguentados.png', cost: 4, classe: '', tipo: 'Ambiente', filiacao: 'Marcial', effect: 'marcial_bonus', text: 'Personagens Marciais recebem +1 de ATK.'
  },
  {
    name: 'Catedral Ensolarada', kind: 'env', img: 'assets/envs/catedral_ensolarada.png', cost: 3, classe: '', tipo: 'Ambiente', filiacao: 'Religioso', effect: 'religioso_protecao', text: 'Aliado recebe -1 de dano até o próximo turno.'
  },
  {
    name: 'Lâmina Serralhada', kind: 'equip', img: 'assets/equip/lamina_serrilhada.png', cost: 1, classe: '', tipo: 'Equipamento', filiacao: 'Marcial', effect: 'dmg_bonus', dmgBonus: 1, text: '+1 de dano para o aliado equipado.'
  },
  {
  name: 'Manto de Couro', kind: 'equip', img: 'assets/equip/manto_couro.png', cost: 1, classe: '', tipo: 'Equipamento', filiacao: 'Neutra', acBonus: 1, hpBonus: 1, text: 'O aliado equipado ganha +1 de CA e +1 de vida.'
  },
  {
    name: 'Orbe de Observação',
    kind: 'equip',
    img: 'assets/equip/orbe_absorcao.png',
    cost: 2,
    classe: '',
    tipo: 'Equipamento',
    filiacao: 'Arcana',
    effect: 'draw_bonus',
    effectValue: 1,
    atkBonus: 0,
    text: 'O aliado equipado ganha +1 de bonus de ataque para cada magia que estiver no seu cemitério.'
  },
  {
    name: 'Redoma Santa', kind: 'equip', img: 'assets/equip/redoma_santa.png', cost: 5, classe: '', tipo: 'Equipamento', filiacao: 'Religioso', acBonus: 2, damageTakenReduction: 3, effect: 'redoma_santa', text: 'O portador recebe −3 de dano recebido e +2 CA. Ao ser equipado em um aliado que já sofreu dano, cura todo o dano desse aliado.'
  },
  {
    name: 'Aranhas Negras, Quelíceras',
    kind: 'equip',
    img: 'assets/equip/aranhas_queliceras.png',
    cost: 3,
    classe: '',
    tipo: 'Equipamento',
    filiacao: 'Neutra',
    effect: 'on_grave_damage_leader',
    effectValue: 2,
    atkBonus: 1,
    text: 'O personagem equipado com esta carta ganha +1 de bônus de ataque. Se esta carta for enviada do campo para o cemitério, o Escolhido inimigo recebe 2 de dano.'
  },
  {
    name: 'Tônico Revigorante', kind: 'spell', img: 'assets/spell/tonico_revigorante.png', cost: 1, classe: '', tipo: 'Magia', filiacao: 'Arcana',
     escolha1: true, effectA: { type: 'heal', value: 3 }, effectB: { type: 'draw', value: 1 }, text: 'Escolha: Cure 3 de vida ou Compre 1 carta.'
  },
   {
    name: 'Alerta de Fuga', kind: 'spell', img: 'assets/spell/alerta_fuga.png', 
    cost: 5,
    classe: '', tipo: 'Magia', filiacao: 'Marcial', escolha1: true,
    effectA: { type: 'ban_on_enter'}, effectB: { type: 'search_deck', query: {kind: 'spell', filiacao: 'Marcial'}, max:12 }, text: 'Escolha: escolha um aliado inimigo, ele é banido ou adicione uma carta de magia, de filiação Marcial, do seu baralho para sua mão.'
  },
  {
  name: 'Fruto Abençoado', kind: 'spell', img: 'assets/spell/fruto_abencoado.png', cost: 0, classe: '', tipo: 'Magia', filiacao: 'Neutra', escolha1: true,
    effectA: { type: 'heal', value: 1 },
    effectB: { type: 'fragment_back', value: 1 },
    text: 'Escolha 1 destes efeitos: cure 1 de vida de um aliado; ou desvire 1 de seus fragmentos.'
  },
  {
    name: 'Resgate de Energia', kind: 'spell', img: 'assets/spell/resgate_energia.png', cost: 3, classe: '', tipo: 'Magia', filiacao: 'Neutra', escolha1: true,
    effectA: { type: 'tap_ally' },
    effectB: { type: 'atk_temp', value: 2 },
    text: 'Escolha 1: Deite um aliado; ou escolha um personagem, dê +2 de bônus de ataque até o fim do turno.'
  },
  {
    name: 'Quebra-Aço', kind: 'spell', img: 'assets/spell/quebra_aco.png', cost: 1, classe: '', tipo: 'Magia', filiacao: 'Neutra', effect: 'destroy_equip', text: 'Destrua um equipamento em campo.'
  },
  {
    name: 'Sede de Vingança', kind: 'spell', img: 'assets/spell/sede_de_vingança.png', cost: 5, classe: '', tipo: 'Magia', filiacao: 'Marcial', effect: 'sede_vinganca', effectValue: 3, text: 'Escolha um Guerreiro aliado: +3 ATK até o fim do turno. Se atacar e derrotar um inimigo, compre 1 carta. O personagem pode levantar e atacar uma segunda vez neste turno.'
  },
  {
    name: 'Gladiador Implacável', kind: 'ally', img: 'assets/allies/gladiador_implacavel.png', cost: 4, classe: 'Guerreiro', tipo: 'Humano', filiacao: 'Marcial', ac: 9, hp: 4, maxHp: 4, damage: 2, atkBonus: 2, keywords: [], effect: 'buff_on_kill', effectValue: { atk: 1, ac: 1 }, text: 'Ao derrotar um inimigo, ganha +1 de ATK e +1 de AC permanentemente.'
  },
  {
  name: 'Kornex Ronin', kind: 'ally', img: 'assets/allies/kornex_ronin.png', cost: 2, classe: 'Guerreiro', tipo: 'Humano', filiacao: 'Marcial', ac: 9, hp: 4, maxHp: 4, damage: 2, atkBonus: 2, keywords: [], effect: 'kornex_buff_per_marcial_in_play', effectValue: 1, text: 'Ganha +1 de ATK e +1 de DANO para cada outra carta de filiação Marcial em campo (inclui escolhido, aliados, ambientes, equipamentos).'
  },
  {
    name: 'Livro Arcano Instável', kind: 'equip', img: 'assets/equip/livro_arcano_instavel.png', cost: 2, classe: '', tipo: 'Equipamento', filiacao: 'Arcana', effect: 'olhar_topo', atkBonus: 1, text: 'O aliado equipado ganha +1 de ATK. Ao entrar em campo, olhe as 2 cartas do topo do seu deck, escolha uma para voltar ao topo e a outra vai para o fundo.'
  },
  // Exemplo: carta que exige pagar vida de um aliado em vez de fragmentos
  {
    name: 'Aranhas Negras, Milícia', kind: 'spell', img: 'assets/spell/aranhas_milicia.png', cost: 1, classe: '', tipo: 'Magia', filiacao: 'Sombras', effect: 'blood_sacrifice', costHp: 2, text: 'Pague 2 de vida de um aliado: cause 4 de dano a um inimigo.'
  },
   // Adicione todas as cartas reais aqui!
  {
    name: 'Pica_pau Agulheiro', kind: 'ally', img: 'assets/allies/picapau_agulheiro.png', cost: 2, classe: 'Criatura', tipo: 'Animal', filiacao: 'Neutra', ac: 6, hp: 2, maxHp: 2, damage: 2, atkBonus: 2, keywords: [],
    effect: 'damage_ally_on_enter', effectValue: 1, text: 'Ao entrar em campo, você pode causar 1 de dano a outro de seus aliados. Se o fizer, compre 1 carta.'
  },
  
  // --- Cartas de exemplo para testar search_deck ---
 {
    name: 'Bom Fruto', kind: 'spell', img: 'assets/spell/bom_fruto.png', cost: 2, classe: '', tipo: 'Magia', filiacao: 'Religioso',
    effect: 'search_deck', query: { name: 'Fruto Abençoado' }, max: 12, title: 'Buscar Fruto Abençoado', text: 'Adicione 1 carta Fruto Abençoado do seu baralho para sua mão.'
  },
  {
    name: 'Aranhas Negras, Observadora', kind: 'ally', img: 'assets/allies/aranhas_observadora.png', cost: 1, classe: 'cidadão', tipo: 'elfo', filiacao: 'Sombras',
    ac: 9, hp: 2, maxHp: 2, damage: 1, atkBonus: 0,
    effect: 'search_deck', query: { name: 'Aranhas Negras' }, max: 15, text: 'Ao entrar em campo, busque uma carta Aranhas Negras do seu deck para sua mão.'
  },
  {
    name: 'Amizade com a Floresta', kind: 'spell', img: 'assets/spell/amizade_floresta.png', cost: 4, classe: '', tipo: 'Magia', filiacao: 'Religioso',
    effect: 'amizade_floresta', effectValue: { damageToAnimal: 2, healValue: 4 }, text: 'Escolha um aliado do tipo Animal: cause 2 de dano a este aliado; depois cure 4 pontos de vida do seu escolhido.'
  },
  // Cartão de teste para self_discard -> força o inimigo a descartar 1 carta aleatória
  {
    name: 'Aranhas Negras, Informante',
    kind: 'ally',
    img: 'assets/allies/aranhas_informante.png',
    cost: 5,
    classe: 'Guerreiro',
    tipo: 'Humano',
    filiacao: 'Sombras',
    ac: 11,
    hp: 6,
    maxHp: 6,
    damage: 4,
    atkBonus: 4,
    keywords: [],
    effect: 'aranhas_informante',
    effectValue: { damage: 4, discard: 1 },
    text: 'Ao entrar em campo: cause 4 de dano ao líder inimigo. Em seguida, descarte 1 carta aleatória da mão do oponente.'
  },
];

if (typeof window !== 'undefined') {
  window.CARD_DEFS = CARD_DEFS;
}

// Validação automática dos campos das cartas
if (typeof window !== 'undefined') {
  window.CARD_DEFS = CARD_DEFS;
  // Validador simples
  CARD_DEFS.forEach((card, idx) => {
    let missing = [];
    if (!card.name) missing.push('name');
    if (!card.kind) missing.push('kind');
    if (!card.img) missing.push('img');
    if (!card.classe) missing.push('classe');
    if (!card.tipo) missing.push('tipo');
    if (!card.filiacao) missing.push('filiacao');
    if (missing.length) {
      console.warn(`Carta ${idx} (${card.name||'sem nome'}): campos faltando:`, missing);
    }
  });
}
// Removido export para compatibilidade com <script> HTML

// Lista de efeitos customizados:
// - curar_animal: Ao entrar em campo, cura 1 de vida de um aliado do tipo Animal.
// - aura_hp: Aura que aumenta a vida máxima de aliados da Classe Cidadão.
// - buff_on_kill: Ao derrotar um inimigo, ganha bônus permanente.
// - olhar_topo: Revela a carta do topo do deck ao entrar em campo.
// - kornex_buff_per_marcial_in_play: Kornex Ronin ganha +1 ATK para cada outra carta Marcial em campo.
// - costHp: novo campo opcional que indica que o custo da carta deve ser pago com HP de um aliado (ex.: costHp: 2). O motor exibirá uma escolha de aliado/líder para pagar a vida antes de resolver a carta. Após o pagamento, a carta continua a ser resolvida normalmente (útil para efeitos como 'blood_sacrifice').
// Adicione novos efeitos aqui para referência e documentação.
