# EFFECTS — Nomenclaturas e comportamentos

Este arquivo lista as nomenclaturas (keys) de `effect` usadas no projeto Mytragor e descreve o que cada efeito faz, quais campos adicionais são esperados (`effectValue`, `dmgBonus`, etc.) e recomendações de uso ao adicionar novas cartas em `assets/cards/cartas.js`.

Use este guia quando for criar novas cartas para garantir que o campo `effect` receba um nome correto e que todos os parâmetros necessários sejam preenchidos.

---

## Convenções gerais
- `effect` (string): nome do comportamento especial da carta (por exemplo, `curar_animal`, `destroy_equip`).
- `effectValue` (number, opcional): valor numérico usado por alguns efeitos (ex.: quantidade de cura, bônus de ATK temporário).
- `escolha1` (boolean, opcional): indica que a carta oferece uma escolha entre duas opções (usada com `effectA` e `effectB`).
- Propriedades de equipamento (aplicadas automaticamente ao equipar se presentes):
  - `atkBonus`: valor adicionado ao ataque/atkBonus do alvo (se usado no projeto).
  - `dmgBonus` ou `damageBonus`: valor adicionado ao `damage` (dano) do alvo quando equipado.
  - `acBonus`: valor adicionado à classe de armadura (AC) do alvo.
  - `hpBonus`: vida adicionada (geralmente ajusta `hp`/`maxHp` quando aplicado).
  - `acBonus`, `hpBonus` etc. são aplicados pela lógica de equip do simulador — use nomes consistentes (veja exemplos abaixo).
- Nomes de efeitos devem ser curtos, em snake_case e descritivos (por ex. `curar_animal`, `destroy_equip`).

---

## Lista de efeitos conhecidos e descrição

### curar_animal
  { effect: 'curar_animal', effectValue: 1 }

## Efeitos adicionais (padronizações e mapeamentos)

Este projeto evoluiu com nomes distintos para efeitos similares em diferentes pontos do código. Abaixo há recomendações de nomes padronizados (snake_case) e mapeamentos/aliases para compatibilidade.

- anular_ataque
  - Alias/antigo: `freeser`, `constricao` (nome da carta)
  - O que faz: Reação que nega um ataque declarado pelo oponente. Além de anular o ataque, marca o atacante para não desvirar no próximo início de turno do controlador (o simulador usa uma flag como `_skipNextUntap`).
  - Campos usados: nenhum extra padrão. Cartas do tipo `truque` devem usar `effect: 'anular_ataque'`.

- tap_enemy
  - Onde: usado por magias como "Raio de Gelo".
  - O que faz: Deita (taps) um inimigo alvo (líder ou aliado). O alvo recebe `tapped = true` e pode receber flags temporárias. A carta que ativa o efeito é enviada ao cemitério após resolução.

- agiota
  - Onde: cartas como "Aranhas Negras, Agiota".
  - O que faz: Permite pagar vida de um aliado (campo `costHp`) como alternativa ao custo em fragmentos para jogar cartas de custo limite (ex.: <=3). Deve ser controlado por uso por turno. Documente `costHp` quando aplicar.

- ban_on_enter
  - Onde: triggers ao entrar em campo.
  - O que faz: Ao entrar em campo, permite banir/retirar uma carta do jogo (ou da mão). Use `effectValue` para indicar quantas cartas ou filtros adicionais.

- destroy_equip_on_enter
  - Onde: goblin e similares.
  - O que faz: Ao entrar em campo, destrói um equipamento em jogo (alvo). Similar a `destroy_equip` mas com timing "on enter".

- ally_heal_buff
  - Onde: "Porco Espinho Furioso".
  - O que faz: Sempre que um aliado do controlador for curado, esta carta ganha buffs permanentes (ex.: +1 atk, +1 damage, +1 ac, +1 hp). Use `effectValue` ou documentar as propriedades que mudam.

- blood_sacrifice
  - Onde: magias como "Sacrifício de Sangue".
  - O que faz: Permite pagar HP de um aliado (campo `costHp`) para causar dano a inimigo. `costHp` deve ser checado antes de resolver o efeito e o pagamento efetuado (com alvo de pagamento escolhido pelo jogador).

- damage_ally_on_enter
  - Onde: cartas de troca/risco.
  - O que faz: Ao entrar em campo, opcionalmente causa dano a outro aliado para obter um benefício (ex.: comprar 1 carta). Use `effectValue` para parametrizar a quantidade.

- search_deck
  - Já documentado acima, mas destacamos que é amplamente usado por cartas/equipamentos com `query` e `max`. Confirme `title`/`max`/`query` ao adicionar novas variações.

- atk_per_marcial_in_play
  - Alias/antigo: `kornex_buff_per_marcial_in_play`
  - O que faz: Concede +N ATK (ou `atkBonus`) para a carta por cada outra carta em campo com filiação `Marcial`. Use `effectValue` para indicar N. Preferir este nome padronizado em vez de nomes específicos por carta.

- amizade_floresta
  - Onde: cartas relacionadas à floresta.
  - O que faz: Efeitos multi-step (escolher um aliado Animal, causar dano nele e depois curar outro alvo). Documente como o efeito seleciona alvos e em que ordem se resolvem as etapas.

- on_grave_damage_leader
  - Onde: equipamentos que punem quando vão para o cemitério.
  - O que faz: Trigger que causa dano ao líder inimigo quando a carta é enviada do campo para o cemitério. Use `effectValue` para parametrizar dano.

- redoma_santa
  - Observação: embora `redoma_santa` já exista como `effect` em cartas, a documentação detalhada foi adicionada aqui: fornece redução de dano (`damageTakenReduction`), bônus de AC (`acBonus`) e cura ao equipar em aliado ferido.

---

Se desejar, posso aplicar automaticamente as renomeações no código (substituir `freeser` -> `anular_ataque`, `kornex_buff_per_marcial_in_play` -> `atk_per_marcial_in_play`) e adicionar aliases nos lugares que julgar necessário. Também posso gerar um patch para normalizar nomes em todo o repositório.
- Tipo: `ally` (trigger ao morrer/ser destruído)
- O que faz: Quando destruído, invoca um aliado "Cidadão" da mão.
- Campos usados: nenhum extra padrão; comportamentos dependem de implementação.

### olhar_topo
- Tipo: `ally` (trigger ao entrar em campo)
- O que faz: Permite olhar a carta do topo do seu deck e escolher deixá-la no topo ou no fundo.
- Campos usados: nenhum extra.

### aura_hp
- Tipo: `ally` (aura)
- O que faz: Enquanto estiver em campo, concede +N HP a aliados que satisfaçam `auraTarget`.
- Campos usados: `effectValue` (N), `auraTarget` (objeto com critérios, por ex. `{ classe: 'Cidadão' }`), `auraScope` (ex.: `'allies'`).
- Exemplo:
  { effect: 'aura_hp', effectValue: 1, auraTarget: { classe: 'Cidadão' }, auraScope: 'allies' }

### dano_2_inimigo (ou dano_X_inimigo)
- Tipo: `spell`
- O que faz: Causa 2 de dano a um inimigo alvo (ou X se nomear diferente ou usar `effectValue`).
- Campos usados: às vezes `effectValue` para generalizar; no projeto atual é `dano_2_inimigo`.

### anular_magia_truque
- Tipo: `truque`/reactive
- O que faz: Anula uma magia ou truque ativada pelo oponente (contramágica/interrupt).
- Campos usados: nenhum extra.

### arcana_draw
- Tipo: `env` (ambiente)
- O que faz: Em determinados turnos (ex.: se o escolhido for Arcano), concede compra extra.
- Campos usados: sem padrão; ambiente implementa a lógica.

### sombra_penalty
- Tipo: `env`
- O que faz: Penaliza jogadores não-Sombra (ex.: -1 ação no turno).

### marcial_bonus
- Tipo: `env`
- O que faz: Dá bônus para personagens Marciais (ex.: +1 ATK).

### religioso_protecao
- Tipo: `env`
- O que faz: Reduz dano recebido de aliados religiosos (ex.: -1 de dano).

### dmg_bonus (ou dmg_bonus / damageBonus)
- Tipo: `equip` (equipamento)
- O que faz: Ao equipar, adiciona X de dano ao alvo (incrementa `damage` do alvo).
- Campos usados: `dmgBonus` (número) — no projeto usamos `dmgBonus: 1` para representações simples.
- Observação: também aceitamos `damageBonus` como alternativa. Use uma convenção única.

### draw_bonus / orbe related
- Tipo: `equip` ou `effect`
- O que faz: Ao equipar, concede compra adicional em certas condições.
- Campos usados: nenhum extra; implementação específica do simulador pode ler `effect`.

### heal_or_draw
- Tipo: `spell`
- O que faz: Dá ao jogador a escolha entre curar ou comprar cartas.
- Campos usados: `escolha1: true`, `effectA`, `effectB` onde cada `effectX` descreve a opção.
- Exemplo:
  { effect: 'heal_or_draw', escolha1: true, effectA: { type: 'heal', value: 3 }, effectB: { type: 'draw', value: 2 } }

### destroy_equip
- Tipo: `spell`
- O que faz: Destroi um equipamento em campo (geralmente escolhe alvo entre equipamentos).

### sede_vinganca
- Tipo: `spell`
- O que faz: Dá um buff temporário (+N ATK) a um aliado guerrreiro (ou classe similar). Pode ter efeitos condicionais ao derrotar inimigos.
- Campos usados: `effectValue` (N)

### reflect_damage
- Tipo: `equip`
- O que faz: Marca o equipamento/alvo com a propriedade de refletir X de dano de volta ao atacante. A implementação pode checar `effect === 'reflect_damage'` ao calcular danos.
- Campos usados: nenhuma obrigatória; você pode adicionar `reflectValue: 1` se quiser parametrizar.

### buff_per_name_in_play
- Tipo: `leader` ou qualquer carta que deseje ganhar bônus dinâmico por nomes em campo
- O que faz: Concede bônus ao portador para cada carta em campo cujo nome contenha uma substring específica (case-insensitive). Pode contar aliados, equipamentos, ambientes, etc. O efeito é idempotente e recalculado a cada recomputeAuras.
- Campos usados:
  - `matchName` (string): substring a ser buscada nos nomes das cartas em campo (ex: 'Aranhas Negras')
  - `effectValue` (number): valor do bônus por carta encontrada
  - `targetProp` (string): propriedade(s) a serem aumentadas, separadas por '+', ',' ou espaço (ex: 'atk+damage', 'atk', 'damage')
- Exemplo:
  ```js
  {
    effect: 'buff_per_name_in_play',
    matchName: 'Aranhas Negras',
    effectValue: 1,
    targetProp: 'atk+damage'
  }
  ```
- Observações:
  - O efeito soma o bônus para cada carta em campo (aliado, equipamento, ambiente, etc.) cujo nome contenha a substring informada.
  - Equipamentos só contam se estiverem equipados em algum aliado/líder.
  - O efeito é recalculado automaticamente ao entrar/sair cartas do campo.
  - Útil para líderes ou cartas que "comandam" ou se beneficiam de um tipo específico de tropa ou item.

### buff_on_kill
- Tipo: `ally` (trigger ao derrotar um inimigo)
- O que faz: Sempre que este aliado derrota um inimigo (reduz o HP a zero em combate), ele ganha +1 de ATK e +1 de AC permanentemente.
- Campos usados: `effectValue` (objeto, ex: `{ atk: 1, ac: 1 }`)
- Exemplo:
  { effect: 'buff_on_kill', effectValue: { atk: 1, ac: 1 } }

### atk_per_marcial_in_play
- Tipo: `ally` (passivo)
- O que faz: Este aliado ganha +1 de ATK para cada outra carta de filiação Marcial em campo (inclui líder, aliados, ambientes e equipamentos).
- Campos usados: `effectValue` (quanto de bônus por carta Marcial)
- Exemplo:
  { effect: 'atk_per_marcial_in_play', effectValue: 1 }

### buff_per_filiacao_in_play
- Tipo: `ally`, `leader`, `equip`, `env` (passivo)
- O que faz: Esta carta ganha um bônus em uma propriedade (`buffTargetProp`) para cada outra carta em campo com determinada filiação (`buffFiliacao`).
- Campos usados: `effectValue` (quanto de bônus por carta), `buffTargetProp` (propriedade a ser aumentada, ex: 'atkBonus', 'ac', 'damage'), `buffFiliacao` (filiação alvo, ex: 'Marcial', 'Arcana').
- Exemplo:
  { effect: 'buff_per_filiacao_in_play', effectValue: 1, buffTargetProp: 'atkBonus', buffFiliacao: 'Marcial' }

---

## Outras chaves/fields relacionados (não são `effect` mas importantes ao criar cartas)
- `atkBonus`: bônus de ataque (adicionado a `atkBonus` do alvo).
- `dmgBonus` / `damageBonus`: aumento de `damage` do alvo.
- `acBonus`: bônus temporário/permanente à AC do alvo.
- `hpBonus`: bônus de vida (ajusta hp/maxHp conforme lógica do simulador).
- `keywords`: array de traits (ex.: `['bloquear','provocar']`) usados por diversas lógicas.
- `effectValue`: número usado por muitos efeitos para parametrizar magnitude.
- `auraTarget`: objeto que descreve filtro para a aura (ex.: `{ classe: 'Cidadão' }`).

---

## Boas práticas ao adicionar novas cartas
1. Use `effect` com nome em snake_case, curto e descritivo.
2. Preencha `effectValue` quando o efeito precisar de um número (como cura ou buff em quantidade).
3. Para equipamentos que dão atributos, prefira usar campos explícitos (`atkBonus`, `dmgBonus`, `acBonus
```js
{
  name: 'Cervo de Galhos Brancos',
  kind: 'ally',
  img: 'assets/allies/cervo_ga_brancos.png',
  cost: 3,
  classe: 'Criatura',
  tipo: 'Animal',
  filiacao: 'Religioso',
  ac: 6, hp: 3, maxHp: 3,
  damage: 2,
  atkBonus: 1,
  keywords: [],
  effect: 'curar_animal',
  effectValue: 1,
  text: 'Ao entrar em campo, cura 1 de vida de um aliado do tipo Animal.'
}
```

---

Se quiser, eu posso:
- Gerar este arquivo também como JSON (para uso programático),
- Inserir templates de cartões prontos (snippets) para adicionar novas cartas rapidamente,
- Ou verificar `CARD_DEFS` e listar automaticamente todos os efeitos encontrados (atualizarei o arquivo com qualquer efeito novo detectado).

Diga se prefere versão JSON, snippets ou que eu gere automaticamente a lista baseada no código atual (posso atualizar o arquivo com efeitos detectados automaticamente).

---

### Referência detalhada de efeitos (exemplos e campos)

Esta seção dá exemplos práticos e os campos esperados ao usar cada `effect` detectado no código. Use estes exemplos como base ao adicionar novas cartas em `assets/cards/cartas.js`.

#### anular_ataque
- Tipo: `truque` (reação)
- O que faz: Quando um inimigo declara um ataque, anula aquele ataque e faz com que o atacante permaneça deitado (não desvira) no próximo início de turno do controlador.
- Campos/flags usados: nenhum campo extra obrigatório; durante execução o motor marca o atacante com `_skipNextUntap = (_skipNextUntap||0)+1`.
- Exemplo:
```
{ name: 'Constrição', kind: 'truque', cost: 4, effect: 'anular_ataque', text: 'Negue um ataque declarado; o atacante não desvira no próximo início do seu controlador.' }
```

#### tap_enemy
- Tipo: `spell`
- O que faz: Deita (tap) um inimigo alvo (pode ser líder ou aliado). O alvo recebe `tapped = true`.
- Campos/flags usados: nenhum extra obrigatório; a implementação de `playFromHand` deve procurar `c.effect === 'tap_enemy'` e permitir escolha de alvo.
- Exemplo:
```
{ name: 'Raio de Gelo', kind: 'spell', cost: 1, effect: 'tap_enemy', text: 'Deite um inimigo.' }
```

#### agiota
- Tipo: `ally` (habilidade passiva/ativável)
- O que faz: Permite ao controlador pagar HP de um aliado (campo `costHp` em algumas implementações) em vez de fragmentos para jogar cartas até certo custo. Deve ter controle de uso por turno (ex.: `_agiotaUsed`).
- Campos/flags sugeridos: `costHp` (número), `_agiotaUsed` (boolean/flag por turno).
- Exemplo:
```
{ name: 'Aranhas Negras, Agiota', kind: 'ally', effect: 'agiota', costHp: 2, text: 'Uma vez por turno: pague 2 de vida desta carta para jogar uma carta de custo ≤ 3.' }
```

#### ban_on_enter
- Tipo: `ally` (trigger ao entrar)
- O que faz: Ao entrar em campo, permite banir/retirar uma carta (da mão/campo/etc.).
- Campos sugeridos: `effectValue` (quantidade), `auraTarget`/`auraScope` quando usado em conjunto com aura.
- Exemplo:
```
{ name:'Aranhas Negras, Executor', effect:'ban_on_enter', effectValue:1, auraTarget:{nameIncludes:'Aranhas Negras'}, auraScope:'allies' }
```

#### destroy_equip_on_enter
- Tipo: `ally`
- O que faz: Ao entrar em campo, destrói um equipamento em jogo (alvo).
- Exemplo:
```
{ name:'Goblin Sabotador', effect:'destroy_equip_on_enter', text:'Ao entrar em campo, destrua um equipamento.' }
```

#### ally_heal_buff
- Tipo: `ally` (trigger passivo)
- O que faz: Quando um aliado do controlador for curado, esta carta ganha buffs permanentes (atk, damage, ac, hp).
- Campos/flags sugeridos: `effectValue` ou documentação interna indicando quais propriedades são afetadas.
- Exemplo:
```
{ name:'Porco Espinho Furioso', effect:'ally_heal_buff', text:'Quando um aliado for curado, ganha +1 permanente em atk/damage/ac/hp.' }
```

#### blood_sacrifice
- Tipo: `spell`
- O que faz: Permite pagar HP de um aliado (`costHp`) para causar dano a um inimigo. O motor deve solicitar escolha de qual aliado pagará o HP antes de resolver.
- Campos/flags: `costHp` (número), `effectValue` (dano causado)
- Exemplo:
```
{ name:'Sacrifício de Sangue', kind:'spell', cost:0, effect:'blood_sacrifice', costHp:2, effectValue:4 }
```

#### damage_ally_on_enter
- Tipo: `ally` (trigger)
- O que faz: Ao entrar em campo, opcionalmente causa dano a outro aliado para obter um benefício (ex.: comprar 1 carta).
- Campos: `effectValue` (quantidade de dano)
- Exemplo:
```
{ name:'Pica_pau Agulheiro', effect:'damage_ally_on_enter', effectValue:1 }
```

#### atk_per_marcial_in_play
- Tipo: `ally` (passivo)
- O que faz: Esta carta ganha `effectValue` de ATK para cada outra carta de filiação 'Marcial' em campo (inclui líder, aliados, ambientes, equipamentos equipados).
- Exemplo:
```
{ name:'Kornex Ronin', effect:'atk_per_marcial_in_play', effectValue:1 }
```

#### amizade_floresta
- Tipo: `spell`/`effect` multi-step
- O que faz: Escolha um aliado do tipo Animal: cause X dano nesse aliado, depois cure Y no escolhido/Outro alvo. Use `effectValue` como objeto para parametrizar (ex.: `{ damageToAnimal:2, healValue:4 }`).

#### on_grave_damage_leader
- Tipo: `equip`/trigger
- O que faz: Quando a carta é enviada do campo para o cemitério, causa `effectValue` de dano ao líder inimigo.
- Exemplo:
```
{ name:'Aranhas Negras, Quelíceras', effect:'on_grave_damage_leader', effectValue:2 }
```

#### redoma_santa
- Tipo: `equip`
- O que faz: Reduz dano recebido (`damageTakenReduction`), aumenta AC (`acBonus`) e ao ser equipada em um aliado que já sofreu dano cura todo o dano.
- Campos: `damageTakenReduction`, `acBonus`.

#### search_deck
- Tipo: `ally`/`spell`/`equip`
- O que faz: Busca no deck por cartas que satisfaçam `query` (ex.: `{ classe:'Guerreiro' }`) e traz para a mão ou topo do deck; `max` e `title` são opcionais para configurar limite e UI.

#### dano_2_inimigo (dano_X_inimigo)
- Tipo: `spell`
- O que faz: Causa `effectValue` (ou 2 no caso literal `dano_2_inimigo`) de dano a um inimigo alvo.

#### destroy_equip
- Tipo: `spell`
- O que faz: Destrói um equipamento alvo em campo.

#### anular_magia_truque
- Tipo: `truque`/reação
- O que faz: Anula uma magia ou truque ativada pelo oponente (contramágica). Ex.: `Conversa Fiada`.

#### tap_enemy (detalhe)
- Observação prática: A implementação atual em `mytragor_simulador.html` já pede ao jogador que escolha um alvo via modal, e a IA escolhe automaticamente um aliado inimigo preferencialmente. O alvo recebe `tapped = true` e a carta é enviada ao cemitério.

---

Se quiser, posso agora:
- Gerar um JSON com todos esses efeitos (útil para validação/IDE).  
- Ou executar alterações adicionais no código para usar somente nomes padronizados (opção 3 anterior).  

Também vou executar checagens rápidas dos fluxos (Constriçao, Raio de Gelo, IA) no código e reportar resultados (já detectei handlers para todos os efeitos mencionados). Veja o relatório a seguir.
---

## AUTOMATICALLY DETECTED EFFECTS (sinc)

Varri o código e detectei as seguintes chaves `effect` usadas no projeto. Algumas já têm documentação acima; as que seguem têm uma nota curta e os campos comumente usados.

- anular_ataque — Reação que anula um ataque declarado; marca o atacante para não desvirar no próximo início de turno (usa `_skipNextUntap`). (alias: `freeser`)
- anular_magia_truque — Anula uma magia/truque ativada pelo oponente (contramágica/interrupt).
- arcana_draw — Ambiente/efeito que concede compra extra quando condições arcana são satisfeitas.
- amizade_floresta — Efeito multi-step: causa dano a um aliado Animal e então cura outro alvo; usa um objeto em `effectValue` para parâmetros.
- agiota — Permite pagar HP de um aliado (`costHp`) como alternativa ao custo em fragmentos; controlar uso por turno.
- ally_heal_buff — Ao curar um aliado do controlador, dá buffs permanentes ao portador (atk/damage/ac/hp).
- atk_per_marcial_in_play — Concede `effectValue` de ATK para cada carta de filiação Marcial em campo (padronização de `kornex_buff_per_marcial_in_play`).
- ban_on_enter — Trigger ao entrar que permite banir/retirar cartas (usar `effectValue`/filtros).
- buff_on_kill — Ganha bônus permanente ao derrotar inimigos (ex.: `{ atk:1, ac:1 }`).
- curar_animal — Cura X de vida em um aliado do tipo Animal (`effectValue`).
- damage_ally_on_enter — Ao entrar, pode causar dano a outro aliado como condição para um benefício (`effectValue`).
- dano_2_inimigo — Causa 2 de dano a um inimigo (ou generalizar como `dano_X_inimigo`).
- destroy_equip — Destroi um equipamento alvo.
- destroy_equip_on_enter — Variant: destrói equipamento ao entrar em campo.
- draw_bonus — Equipamento/efeito que concede compra extra em certas condições (`effectValue`).
- dmg_bonus — Equipamentos que adicionam dano (`dmgBonus`).
- heal_or_draw — Escolha entre curar ou comprar (usa `escolha1`, `effectA`/`effectB`).
- on_grave_damage_leader — Ao ir para o cemitério, causa dano ao líder inimigo (`effectValue`).
- olhar_topo — Olha a carta do topo do deck e permite escolher topo/fundo.
- redoma_santa — Equipamento que reduz dano recebido, adiciona AC e pode curar ao equipar em aliado ferido.
- search_deck — Busca no deck por critérios (`query`, `max`, `title`).
- sede_vinganca — Buff temporário e condição especial se o alvo derrotar um inimigo; usa `effectValue` para magnitude.
- tap_enemy — Deita (taps) um inimigo alvo (usado por `Raio de Gelo`); define `tapped = true`.
- blood_sacrifice — Permite pagar HP de um aliado (`costHp`) para causar dano a inimigo.

Observação: esta lista é a sincronização automática dos `effect` detectados. Posso (escolha):

1) Expandir cada entrada com exemplos de uso e campos (vou gerar exemplos e atualizar o arquivo).  
2) Gerar um JSON com a lista para uso programático.  
3) Aplicar renomeações/aliases no código automaticamente (por ex. garantir que apenas os nomes padronizados sejam usados em todo o projeto).

Diga qual opção prefere que eu execute a seguir: 1, 2 ou 3.
---

## AUTOMATICALLY DETECTED EFFECTS (sinc)

Rodando uma varredura no código (arquivos `assets/cards/cartas.js` e `mytragor_simulador.html`) detectei as seguintes chaves `effect` usadas no projeto. Algumas já estão documentadas acima; outras foram adicionadas nesta seção com uma breve nota e sugestão de campos a serem usados. Revise e ajuste as descrições se quiser que eu torne-as mais detalhadas.

- anular_ataque — (alias `freeser`) Reação que anula um ataque declarado; marca atacante para não desvirar no próximo início de turno (usa `_skipNextUntap`).
- anular_magia_truque — Contra-magia/interrupt que anula magias/truques ativados pelo oponente.
- arcana_draw — Ambiente/efeito que concede compra extra quando condições arcana são satisfeitas.
- amizade_floresta — Efeito multi-step (dano a aliado Animal + cura em outro alvo). Use `effectValue` como objeto para parâmetros.
- agiota — Permite pagar HP de aliado (`costHp`) como alternativa ao custo de fragmentos; normalmente limitado a uma vez por turno.
- aliar_heal_buff (ally_heal_buff) — Trigger que dá buffs permanentes quando aliados são curados.
- anular_ataque — (já listado)
- ar: (nota: placeholder)
- atac: (nota: placeholder)
- atk_per_marcial_in_play — Padronização para ganhar ATK por cartas Marciais em jogo (`effectValue` define o valor por carta).
- ban_on_enter — Trigger ao entrar que permite banir/retirar cartas (usar `effectValue`/filtros).
- buff_on_kill — Ganha bônus permanente ao derrotar inimigos (usado por `Gladiador Implacável`).
- buff_per_filiacao_in_play — (documentado acima) bônus por filiação em jogo.
- curar_animal — Cura um aliado do tipo Animal (usa `effectValue`).
- damage_ally_on_enter — Ao entrar, pode causar dano a aliado em troca de benefício (usar `effectValue`).
- dano_2_inimigo — Causa 2 de dano a inimigo (ou generalizar para `dano_X_inimigo`).
- destroy_equip — Destroi um equipamento alvo.
- destroy_equip_on_enter — Variante com timing "on enter".
- draw_bonus — Efeito/equip que concede compras extras em certas condições.
- dmg_bonus — Equipamentos que adicionam dano (`dmgBonus`).
- heal_or_draw — Escolha entre curar ou comprar cartas (usa `escolha1` + `effectA`/`effectB`).
- on_grave_damage_leader — Trigger que causa dano ao líder inimigo quando a carta vai ao cemitério.
- olhar_topo — Olha a carta do topo do deck e escolhe topo/fundo.
- redraw: (nota: placeholder)
- redoma_santa — Equipamento que reduz dano recebido, dá AC e pode curar ao equipar em aliado ferido.
- saco: (nota: placeholder)
- sada_vinganca (sede_vinganca) — Buff temporário + regras condicionais após matar inimigo.
- search_deck — Busca parametrizada no deck por `query`/`max`/`title`.
- sede_vinganca — (já listado acima)
- tap_enemy — Deita (taps) um inimigo alvo (usado por `Raio de Gelo`).
- blood_sacrifice — Paga HP de aliado (`costHp`) para causar dano a inimigo.

Observação: a lista acima foi gerada automaticamente; há algumas entradas duplicadas/aliases (ex.: `anular_ataque` e o antigo `freeser`, `kornex_buff_per_marcial_in_play` já renomeado para `atk_per_marcial_in_play`). Posso refinar a descrição de cada item e remover placeholders/erros se você confirmar que quer documentação mais completa.

Próximo passo que posso executar automaticamente: inserir entradas completas (com exemplos e campos usados) para cada efeito detectado, ou exportar a lista como JSON para uso programático. Diga qual formato prefere que eu aplique agora.