# Guia de Efeitos de Cartas (Referência)

Este documento serve como referência rápida para escrever/entender efeitos em `assets/cards/effects.js`.

## Convenções
- **Registro:** efeitos são definidos e registrados em `effects.js` usando funções utilitárias da engine (`Game.applyAction`, triggers, etc.).
- **Targets:** use chaves como `self`, `ally`, `opponent`, `leader`, `slot`, `pile` para indicar alvos.
- **Fases:** `start`, `main`, `battle`, `end` — combine com triggers.
- **Custo:** gasta fragmentos do pool do lado ativo via ações do tipo `spend`.

## Tipos de Trigger
- **onPlay:** dispara quando a carta é colocada em jogo.
- **onStartTurn:** dispara no início do turno do dono.
- **onPhase:** específico por fase (`main`, `battle`, `end`).
- **onKill / onDamage:** ao causar/receber dano/abater.
- **onDeath:** quando a unidade deixa o campo.
- **onDraw / onDiscard:** ao comprar/descartar.
- **onSpell / onTrick:** ao conjurar magias/truques.

## Ações Comuns
- **Buff:** `+atk`, `+hp`, `+ac`, `atkBonus` no alvo.
- **Heal:** restaurar `hp` até `maxHp`.
- **Damage:** aplicar dano direto a `unit` ou `leader`.
- **Move:** mover carta entre `hand`, `deck`, `grave`, `ban`, `allies`, `spells`.
- **Summon:** colocar aliado/efeito no campo.
- **Draw:** comprar cartas do topo do `deck`.
- **Discard:** descartar da `hand`.
- **Banish:** enviar para `ban` (banidas).
- **Counter:** negar magia/truque (ex.: Conversa Fiada).

## Seleção de Alvos
- **Manual:** UI abre `cardChoiceModal` e retorna `target`.
- **Automática:** primeiro válido conforme filtro (`filiacao`, `tipo`, `hp>0`, `lane`).

## Estrutura Padrão (Pseudo)
```js
Effects.register('effect-key', {
  name: 'Nome do Efeito',
  cost: 1, // fragmentos
  trigger: 'onPlay', // ou onStartTurn, onPhase:main, ...
  target: { side: 'opponent', zone: 'allies', select: 'any' },
  action(ctx){
    const { Game, STATE, you, ai } = ctx
    // Exemplo: dano
    Game.applyAction({ type: 'damage', target: ctx.target, amount: 2 })
  }
})
```

## Exemplos Comuns
- **Buff simples (aliado seu ao jogar):** `onPlay` → `+2 atk` no `ally` selecionado.
- **Dano direto ao líder inimigo:** `main` → `damage leader(opponent) amount:2`.
- **Compra de cartas:** `onPlay` → `draw count:1` para `you`.
- **Conversa Fiada (counter):** abre prompt; se confirmado, nega `spell/trick` do oponente com custo em fragmentos.

## Exemplos Reais (do `effects.js`)
- **Olhar Topo:** `olhar_topo` ativa `habilitarOlharTopo(1, side)` ao entrar.
```js
// onEnterHandlers.olhar_topo
olhar_topo: (card, side) => { setTimeout(() => helpers.enableLookTop(1, side), 10) }
```
- **Curar Animal:** `curar_animal` cura o primeiro aliado `Animal` com vida faltando.
```js
curar_animal: (card, side, pos) => {
  const animais = STATE[side].allies.filter((a,i)=> a && a.tipo==='Animal' && a.hp<a.maxHp && i!==pos)
  if(animais.length){ const alvo=animais[0]; const v=card.effectValue||1; alvo.hp=Math.min(alvo.maxHp, alvo.hp+v); helpers.render() }
}
```
- **Banir Carta ao Entrar:** `ban_on_enter` mostra escolha entre aliados/feitiços/ambiente e move para `ban`.
```js
ban_on_enter: (card, side) => {
  const candidates=[/* coleta spells/allies/env dos dois lados */]
  helpers.showChoice(candidates.map(o=>({card:o.card,label:o.side==='you'?'Seu':'Oponente'})), (chosen,idx)=>{
    const ch=candidates[idx]; /* remove do local e adiciona em STATE[ch.side].ban */ helpers.render()
  }, 'Escolha uma carta para banir')
}
```
- **Destruir Equipamento:** `destroy_equip_on_enter` envia um `equip` de `spells` ao cemitério.
```js
destroy_equip_on_enter: (card, side) => {
  const equips=[/* filtra spells.kind==='equip' */]
  helpers.showChoice(equips.map(e=>({card:e.card,label:e.side==='you'?'Seu':'Oponente'})), (chosen,idx)=>{
    const eq=equips[idx]; helpers.sendEquipToGrave(eq.side, eq.card); helpers.render()
  }, 'Escolha um equipamento para destruir')
}
```
- **Buscar no Deck:** `search_deck` abre busca com `performSearchDeck` e coloca na mão.
```js
search_deck: (card, side) => {
  const q = { ...(card.query||card.effectValue||{}), excludeName: card.name }
  helpers.searchDeck(side, q, card.max||10, card.title||'Buscar no deck', (chosen)=>{ if(chosen){ helpers.render() } })
}
```
- **Causar Dano a Aliado seu:** `damage_ally_on_enter` seleciona outro aliado e aplica `effectValue` de dano.
```js
damage_ally_on_enter: (card, side, pos) => {
  const candidates = (STATE[side].allies||[]).map((a,i)=> a&&i!==pos&&a.hp>0?{obj:a,slot:i}:null).filter(Boolean)
  helpers.showChoice(candidates.map(p=>({card:p.obj})), (chosen,idx)=>{ const pick=candidates[idx]; pick.obj.hp=Math.max(0, pick.obj.hp-(card.effectValue||1)); helpers.render() }, 'Escolha aliado para receber dano')
}
```
- **Descartar da Mão do Oponente:** `discard_enemy_hand` permite escolher carta da mão inimiga e descartar.
```js
discard_enemy_hand: (card, side) => {
  const foe = side==='you'?'ai':'you'; const hand=STATE[foe].hand||[];
  const opts = hand.map((c,i)=>({card:c, idx:i}))
  helpers.showChoice(opts, (chosen,idx)=>{ discardCardFromHand(foe, idx, { reason:'discard_enemy_hand' }); helpers.render() }, 'Escolha uma carta do oponente para descartar')
}
```
- **Aranhas — Informante:** dano no próprio líder e descarta aleatório do oponente.
```js
aranhas_informante: (card, side) => {
  const foe = side==='you'?'ai':'you'; const dmg=(card.effectValue?.damage)||4; STATE[side].leader.hp=Math.max(0,STATE[side].leader.hp-dmg);
  discardRandomFromHand(foe, (card.effectValue?.discard)||1, { reason:'aranhas_informante' }); helpers.render()
}
```
- **Aranhas — Mascote:** cria tokens "Aranhas Negras" em slots vazios.
```js
aranhas_mascote: (card, side) => {
  const freeSlots=(STATE[side].allies||[]).filter(a=>!a).length; const tpl={ name:'Aranhas Negras', kind:'ally', ac:5, hp:1, maxHp:1, damage:1, atkBonus:1, img:'assets/tokens/token_aranhas.png' };
  for(let i=0;i<freeSlots;i++){ MYTRAGOR_EFFECTS.createToken(tpl, side) } helpers.render()
}
```
- **Emboscada (Reação):** `aranhas_emboscada_reaction` paga custo, envia carta à pilha correta e aplica `-3 atkBonusTemp` ao atacante.
```js
MYTRAGOR_EFFECTS.triggerEffect('aranhas_emboscada_reaction', card, attackerSide, attackerCard, defenderSide)
```
- **Bem Treinado (Reação):** ao aliado seu morrer, permite chamar aliado `Marcial` do cemitério.
```js
MYTRAGOR_EFFECTS.notifyAllySentToGrave(deadCard, side)
// Internamente chama triggerEffect('bem_treinado_reaction', ...)
```
- **Ajuda do Povo:** cria até 2 tokens "Cidadãos Unidos" se houver espaço.
```js
MYTRAGOR_EFFECTS.triggerEffect('ajuda_do_povo', card, side)
```
- **Raio de Gelo:** deita (tap) um inimigo — líder ou aliado de maior dano.
```js
MYTRAGOR_EFFECTS.triggerEffect('raio_gelo', card, side)
```
- **Espionagem Sorrateira:** inspeciona mão e permite descartar carta Religiosa/Marcial/Arcana.
```js
MYTRAGOR_EFFECTS.triggerEffect('espionagem_sorrateira', card, side)
```

## Boas Práticas
- Validar alvo antes de aplicar.
- Não vazar estado entre modos (VS IA vs MP).
- Usar `resolveImgPath` para imagens quando necessário.
- Emitir eventos (`Game.emit('TURN_START')`) quando relevante.

## Observações
- Esta referência não substitui o código em `effects.js`; serve para orientar escrita e leitura.
- Adapte nomes/chaves aos existentes na engine.
# EFFECTS — Nomenclaturas e comportamentos

Este arquivo lista as chaves (`effect`) usadas no projeto Mytragor, descreve o comportamento esperado de cada efeito, os campos auxiliares mais comuns (por exemplo `effectValue`, `dmgBonus`) e boas práticas ao adicionar novas cartas em `assets/cards/cartas.js`.

Use-o como referência ao criar ou revisar cartas para garantir consistência entre definição e motor do simulador.

---

## Convenções gerais

- `effect` (string): nome do comportamento especial da carta (ex.: `curar_animal`, `destroy_equip`).
- `effectValue` (number | object, opcional): magnitude do efeito (cura, dano, bônus, etc.).
- `escolha1` (boolean, opcional): indica escolha entre duas opções (usar com `effectA` / `effectB`).
- Propriedades aplicadas por equipamentos ou buffs (nomes recomendados): `atkBonus`, `dmgBonus` / `damageBonus`, `acBonus`, `hpBonus`.
- Prefira nomes curtos em snake_case para `effect` (ex.: `atk_per_marcial_in_play`).

---

## Efeitos padronizados (resumo)

Nota: esta lista apresenta os efeitos detectados no código e recomendações de uso. Se o projeto contiver aliases (nomes antigos), considere normalizá-los utilizando os nomes abaixo.

- anular_ataque — Reação que anula um ataque declarado; marca o atacante para não desvirar no próximo início do turno (usa flag `_skipNextUntap`).
- anular_magia_truque — Anula uma magia/truque ativada pelo oponente (contramágica/interrupt).
- tap_enemy — Deita (tap) um inimigo alvo (`tapped = true`).
- curar_animal — Cura um aliado do tipo Animal. Ex.: `{ effect:'curar_animal', effectValue:1 }`.
- atk_per_marcial_in_play — Ganha `effectValue` de ATK/`atkBonus` por cada carta com filiação `Marcial` em campo (padronização para o que antes era `kornex_buff_per_marcial_in_play`).
- buff_per_filiacao_in_play — Bônus por filiação (use `buffFiliacao` e `buffTargetProp`).
- search_deck — Busca no deck por `query` (use `max` e `title` para configurar UI).
- destroy_equip / destroy_equip_on_enter — Destrói equipamento alvo (variant: on enter).
- damage_ally_on_enter — Ao entrar, causa dano a outro aliado como custo/condição.
- blood_sacrifice — Permite pagar HP de um aliado (`costHp`) para causar dano ao inimigo.
- ban_on_enter — Ao entrar, permite banir/retirar cartas (use `effectValue` para quantidade/filters).
- aura_hp — Aura que concede HP enquanto estiver em campo (use `auraTarget` e `auraScope`).
- on_grave_damage_leader — Ao ir para o cemitério, causa dano ao líder inimigo (`effectValue`).
- redoma_santa — Equipamento que reduz dano recebido, dá `acBonus` e cura ao equipar em aliado ferido.
- dmg_bonus / damageBonus — Usado por equipamentos para aumentar `damage` do alvo (considere `dmgBonus` como padrão simples).
- heal_or_draw — Spell com escolha entre curar ou comprar (use `escolha1`, `effectA`, `effectB`).
- buff_on_kill — Ganha bônus permanente ao derrotar inimigos (use `effectValue` como objeto `{ atk:1, ac:1 }`).
- reflect_damage — Marca alvo para refletir parte do dano de volta (use `reflectValue` se precisar parametrizar).

---

## Estrutura recomendada para efeitos que somam propriedades

Para efeitos que somam múltiplas propriedades (por ex. `atk` e `damage`), prefira usar campos explícitos e rastrear os bônus temporários com propriedades internas (prefixadas com `_`) para que possam ser removidos/recalculados ao recomputar auras:

```js
// Exemplo de card com efeito localizado
{
  name: 'Kornex Ronin',
  kind: 'ally',
  effect: 'atk_per_marcial_in_play',
  effectValue: 1,
  text: 'Ganha +1 de ATK e +1 de DANO para cada Marcial em jogo.'
}
```

No código do simulador, ao aplicar tais efeitos, armazene o bônus aplicado em campos como `card._kornexAtkBonus` e `card._kornexDmgBonus` para permitir remoção segura antes de recalcular.

---

## Boas práticas ao adicionar novas cartas

1. Use `effect` em snake_case, curto e descritivo.
2. Sempre preencha `effectValue` quando o efeito precisa de uma magnitude.
3. Para equipamentos e buffs que modificam atributos, prefira campos explícitos: `atkBonus`, `dmgBonus` (ou `damageBonus`), `acBonus`, `hpBonus`.
4. Se o efeito tiver múltiplas etapas (ex.: escolher alvo A, depois B), documente claramente a ordem e os alvos em `text` e/ou campos auxiliares.
5. Ao renomear efeitos no código, mantenha aliases temporários ou atualize o motor para entender novos nomes (evitar regressões).

---

## Exemplos práticos

Alvo simples (cura a um Animal):

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

Exemplo de `buff_per_name_in_play` (conte bônus por substring no nome):

```js
{
  effect: 'buff_per_name_in_play',
  matchName: 'Aranhas Negras',
  effectValue: 1,
  targetProp: 'atk+damage'
}
```

---

## Automação e próximos passos

Posso executar automaticamente as seguintes operações se desejar:

1) Gerar este arquivo como JSON para uso programático (IDE/validações).
2) Inserir templates/snippets para adicionar cartas rapidamente.
3) Varredura e normalização: substituir aliases antigos pelos nomes padronizados no código e adicionar comentários/aliases quando necessário.

Diga qual opção prefere (1, 2 ou 3) ou peça outra alteração — eu posso aplicar o patch automaticamente ao repositório se autorizar.

---

<!-- Fim do documento -->
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