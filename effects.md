# Lista de Efeitos Customizados do Simulador Mytragor

Este arquivo documenta as chaves `effect` usadas pelas cartas do simulador e campos relacionados (por ex. `effectValue`, `atkBonus`, `auraTarget`). Mantenha-o atualizado sempre que adicionar novos efeitos em `assets/cards/cartas.js`.

---

## Como usar
- `effect` (string): chave usada pelo motor para identificar o comportamento especial da carta.
- `effectValue` (número, opcional): magnitude usada por muitos efeitos (cura, dano, bônus).
- Para equipamentos que dão atributos prefira os campos explícitos: `atkBonus`, `dmgBonus`, `acBonus`, `hpBonus`.

---

## Efeitos encontrados no projeto (descrição breve)

- curar_animal
	- Trigger ao entrar em campo: cura X de vida em outro aliado do tipo `Animal`.
	- Campos: `effectValue` (número de vida).

- aura_hp
	- Aura: enquanto em campo, concede +N HP a aliados que atendam o filtro `auraTarget`.
	- Campos: `effectValue`, `auraTarget` (ex.: `{ classe: 'Cidadão' }`), `auraScope` ('allies').

- buff_on_kill
	- Trigger ao derrotar um inimigo: concede bônus permanente ao aliado (ex.: +ATK/+AC).
	- Campos: `effectValue` (objeto ex.: `{ atk:1, ac:1 }`).

- olhar_topo
	- Ao entrar em campo, permite olhar a carta do topo do deck e escolher deixá-la no topo ou no fundo.

- kornex_buff_per_marcial_in_play (aka atk_per_marcial_in_play)
	- Passivo: ganha +N ATK para cada outra carta de filiação `Marcial` em campo (aliados, líder, ambiente, equipamentos).
	- Campos: `effectValue`.

- chamar_cidadao
	- Trigger ao ser destruído (em combate): invoca um aliado do tipo `Cidadão` da mão do jogador, sem custo.
	- Campos (runtime): `chamarEspecial` pode especificar `classe`/`origem` onde procurar.

- agiota
	- Habilidade de aliado: uma vez por turno permite pagar HP de um aliado (ou dele) para cobrir o custo em fragmentos de uma carta (ex.: pagar 2 HP para jogar uma carta que custa até 3 fragments).
	- Campos: nenhum obrigatório; runtime usa `ally.effect === 'agiota'`.

- costHp (campo de carta, não um effect)
	- Campo que instrui o motor a pedir pagamento de HP de um aliado/líder para pagar o custo da carta (ex.: `costHp: 2`).

- blood_sacrifice
	- Spell: paga HP de um aliado (via `costHp`) para causar dano grande a um inimigo (ex.: pagar 2 HP para causar 4 dano).
	- Campos: `costHp`, `effectValue` conforme implementação.

- destroy_equip / destroy_equip_on_enter
	- Remove/manda um equipamento para o cemitério. `destroy_equip_on_enter` é um trigger ao entrar em campo que solicita destruir um equipamento em campo.

- draw_bonus / orbe-related
	- Equipamento que dá bônus de ataque/compras dependendo do estado do cemitério (ex.: Orbe de Observação dá +1 ATK por magia no cemitério do dono).
	- Campos: `effectValue` (quando aplicável), o motor pode guardar `_orbeAtkBonus` no equip para recalcular.

- dmg_bonus
	- Equipamento: adiciona X ao `damage` do aliado equipado (`dmgBonus` field).

- heal_or_draw
	- Spell com escolha: permite ao jogador escolher curar ou comprar cartas.
	- Campos: `escolha1: true`, `effectA` e `effectB` descrevendo as opções (ex.: `{ type: 'heal', value: 3 }`).

- tap_ally
	- Tipo: `spell`/opção de escolha
	- O que faz: Marca um aliado como `tapped` (deitado). Alianças deitadas não podem atacar até serem levantadas no início do próximo turno.
	- Campos: nenhum extra; use `type: 'tap_ally'` em `effectA`/`effectB` quando `escolha1: true`.

- atk_temp
	- Tipo: `spell`/opção de escolha
	- O que faz: Aplica um bônus temporário de ataque (`atkBonusTemp`) a um aliado ou líder até o fim do turno.
	- Campos: `value` (número de ATK temporário a aplicar). Ex.: `{ type: 'atk_temp', value: 2 }`.

- fragment_back
	- Tipo: `spell`/opção de escolha
	- O que faz: Recupera X fragmentos para o jogador que resolve o efeito (aumenta `STATE.pool[side]`), respeitando `maxPool`.
	- Campos: `value` (número de fragmentos recuperados). Ex.: `{ type: 'fragment_back', value: 2 }`.

- ban_on_enter
	- Tipo: `ally` (trigger ao entrar em campo)
	- O que faz: ao entrar em campo, permite ao dono (ou IA) banir uma carta do campo (spells/equip, aliados, ambiente). Use para efeitos de controle/remoção mais permanentes.
	- Campos: `effectValue` (opcional, usado por UI ou valores relacionados); o motor trata `effect === 'ban_on_enter'` como um trigger ao entrar.

- dano_2_inimigo (ex.: dano_X_inimigo)
	- Spell que causa dano direto a inimigo(s). Use `effectValue` ou variantes para parametrizar.

- anular_magia_truque
	- Truque/efeito reativo: anula magia/truque do oponente (contramágica).

- arcana_draw
	- Ambiente: concede compras extras sob condição (ex.: se o Escolhido for Arcano, compre 1 carta extra no início do turno).

- sombra_penalty
	- Ambiente: penaliza jogadores não-Sombra (ex.: -1 ação no turno).

- marcial_bonus
	- Ambiente: concede bônus para personagens Marciais (ex.: +1 ATK para aliados Marciais).

- religioso_protecao
	- Ambiente/efeito: reduz dano recebido por aliados religiosos (ex.: -1 dano ou similar).

- sede_vinganca
	- Spell/efeito que dá um buff temporário (ex.: +N ATK) a um aliado Guerreiro; pode ter condicionais ao derrotar inimigos (comprar carta, atacar novamente).
	- Campos: `effectValue`.

---

## Efeitos de suporte / utilitários (dinâmico/idempotente)

- buff_per_name_in_play
	- Concede bônus por cada carta em campo cujo nome contenha uma substring (ex.: contar 'Aranhas Negras').
	- Concede bônus por cada carta em campo cujo nome contenha uma substring (ex.: contar 'Aranhas Negras').
	- Campos/variações atuais usadas no motor:
	  - `auraTarget: { nameIncludes: 'substring' }` — filtra alvos pela substring no `name` (case-insensitive).
	  - `auraProp` — qual propriedade afetar (`'atk'` ou `'hp'`). Quando presente, tem prioridade sobre heurísticas extraídas do `effect`.
	  - `effectValue` — valor numérico aplicado por fonte de aura.
	  - `auraScope` — `'allies'|'both'|'foe'` (padrão: 'allies').
	- Exemplo (Aranhas Negras, Executor):
	  `{ effect: 'ban_on_enter', effectValue: 1, auraTarget: { nameIncludes: 'Aranhas Negras' }, auraProp: 'atk', auraScope: 'allies' }`

- buff_per_filiacao_in_play
	- Concede bônus por cada carta em campo com certa filiação.
	- Campos: `effectValue`, `buffTargetProp`, `buffFiliacao`.

- atk_per_marcial_in_play
	- Similar ao `kornex` behavior: ganha ATK por cada carta Marcial em campo.

---

## Boas práticas e campos relacionados
- `atkBonus`: bônus de ataque que será mostrado no card UI.
- `dmgBonus` / `damageBonus`: incremento de `damage` ao equipar.
- `acBonus`: bônus de armadura (CA).
- `hpBonus`: bônus de vida.
- `effectValue`: parâmetro numérico usado por muitos efeitos.

---

Se quiser, eu também posso:
- gerar automaticamente uma lista JSON com todas as `effect` encontradas em `CARD_DEFS` e inseri-la neste arquivo;
- ou normalizar o motor para verificar `effect === 'chamar_cidadao'` ao invés de comparar nomes literais (mais robusto).

Se quiser que eu já aplique a versão JSON ou normalize checagens no motor, diga qual prefere e eu implemento em seguida.

---

## Lista consolidada (por tipo)

Abaixo uma lista compacta das chaves `effect` e utilitários usados no projeto, separadas por tipo/principal uso. Isto facilita localizar comportamentos ao editar `assets/cards/cartas.js` ou o motor.

- Ally / triggers (efeitos que normalmente aparecem em cartas `kind: 'ally'`):
	- curar_animal
	- agiota
	- ban_on_enter
	- destroy_equip_on_enter
	- chamar_cidadao
	- olhar_topo
	- ally_heal_buff
	- aura_hp

- Spells / Truques (efeitos resolvidos quando a carta é jogada):
	- dano_2_inimigo (e variantes `dano_X_inimigo`)
	- anular_magia_truque
	- draw_bonus
	- blood_sacrifice (ex.: custos em HP para dano)
	- fragment_back (frequentemente exposto como opção em escolhas)
	- search_deck — abre uma busca no deck segundo filtros (name, filiacao, cost, classe, tipo) e permite escolher uma carta para ir para a mão.
		- amizade_floresta — spell: escolha um aliado do tipo `Animal` (seu), cause X de dano a este aliado; depois cure Y de vida em um aliado seu (ou líder). Campos: `effectValue: { damageToAnimal: <n>, healValue: <n> }`.

- Ambientes (`kind: 'env'`):
	- arcana_draw
	- sombra_penalty
	- marcial_bonus
	- religioso_protecao

- Equipamentos (`kind: 'equip'`):
	- dmg_bonus
	- orbe-related / draw-or-atk bonuses (ex.: Orbe de Observação logicificada via `draw_bonus`/campos auxiliares)

- Opções / escolhas e utilitários usados em `escolha1` / escolhas internas:
	- tap_ally (deitar um aliado)
	- atk_temp (aplicar `atkBonusTemp` até fim do turno)
	- fragment_back (recupera X fragmentos)
	- search_deck (buscar cartas no deck por filtros e escolher uma para a mão)
	- estrutura: `escolha1: true` com `effectA` / `effectB` contendo objetos do tipo `{ type: 'atk_temp', value: 2 }` ou `{ type: 'fragment_back', value: 1 }`.

- Auras / buffs dinâmicos (aplicados por recomputeAuras / fontes em campo):
	- buff_per_name_in_play (implementado via `auraTarget: { nameIncludes: '...' }`)
	- auraProp (campo que indica qual propriedade alterar: `'atk'|'hp'`)
	- atk_per_marcial_in_play / kornex-like behaviors (bônus por cartas de determinada filiação em campo)

- Outros campos / chaves engine-friendly (não necessariamente `effect` mas relevantes):
	- effectValue (parâmetro numérico genérico)
	- atkBonus / atkBonusTemp
	- dmgBonus
	- acBonus / hpBonus
	- costHp (pagamento em HP como custo alternativo)
	- chamarEspecial / chamarEspecial.{classe,origem}

Se quiser, eu também posso gerar e anexar uma versão JSON dessa lista (por exemplo em `effects.json`) contendo um array com cada efeito e seu tipo — útil para validação automática ao carregar `cartas.js`.