# Roman × Qin Battle

Indie 2D formation tactics - Legion Rome vs Qin dynasty China.
Inspired by Conqueror's Blade / Total War lite, playable in the browser.

**Live:** https://roccat92.github.io/roman-qin-battle/

## Play

1. **Deploy** - drag Roman units inside the blue zone, `Q`/`E` to rotate, `1-4` to set formation.
2. Press **Space** to start the battle.
3. Click a unit, right-click (or left-click empty ground) to order a move. Formations still matter mid-fight.
4. Win when the enemy army routes or is wiped.

## Factions

| Rome | Role | Qin | Role |
|------|------|-----|------|
| Velites | Javelin skirmish | Nỏ binh | Crossbow |
| Hastati | Line infantry + pilum | Bộ binh Tần | Infantry |
| Principes | Heavy infantry | Khiên kích | Shield / spear |
| Triarii | Elite spears | Kỵ binh Tần | Cavalry |
| Equites | Cavalry | | |

## Formations

| Key | Formation | Effect |
|-----|-----------|--------|
| 1 | Line (hàng ngang) | Wide front, solid attack |
| 2 | Wedge (hình nêm) | Charge bonus, weak flanks |
| 3 | Square / Testudo | High defense & flank resist, slow |
| 4 | Skirmish (phóng kỳ) | Speed + ranged, fragile cohesion |

Holding cohesion buffs combat. Flank / rear hits and losses shatter it. Broken units deal far less damage and rout faster.

### Balance notes (v0.1.1)
- **Testudo / square** blocks most Qin crossbow bolts while cohesion holds; protection collapses when the formation breaks.
- **Cavalry** flank/rear charges primarily **shatter cohesion** (disorder), not just chip HP.
- **Triarii** gain a last-stand morale/defense/cohesion brace when friendly units ahead are routing or wiped.

## Controls

- **Drag / click** - select (deploy + battle)
- **Right click** - move order
- **Q / E** - rotate
- **1-4** - formation
- **Space** - start battle
- **P** - pause
- **R** - restart
- **WASD** / middle-mouse drag / Alt+drag - pan camera
- **Scroll** - zoom

## Dev

```bash
npm install
npm run dev
npm test
npm run build
```

Stack: Vite + TypeScript + Canvas2D (no React/Three). Tests cover formation layout, combat aspects, and morale.

### Sprites
Procedural isometric soldier sprites (no external art): each unit type has idle / walk / attack × 4 facings. Romans use **red shields**; Qin wear **black lacquer armor**. Generated at runtime into offscreen canvas sheets (`src/game/sprites.ts`).

## License

MIT - Roccat92 / NEXA Studio
