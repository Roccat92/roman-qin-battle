import type { GameState, FormationKind, Unit } from '../game/types';
import { defOf, aliveCount } from '../game/units';
import { selectedUnit, setFormation, startBattle, restart } from '../game/sim';

const FORMS: { id: FormationKind; key: string; label: string }[] = [
  { id: 'line', key: '1', label: 'Hàng ngang' },
  { id: 'wedge', key: '2', label: 'Hình nêm' },
  { id: 'square', key: '3', label: 'Vuông / Testudo' },
  { id: 'skirmish', key: '4', label: 'Phóng kỳ' },
];

export type HudHandlers = {
  onSelect: (id: string) => void;
  onStart: () => void;
  onRestart: () => void;
  onPause: () => void;
  onForm: (f: FormationKind) => void;
};

export function mountHud(root: HTMLElement, handlers: HudHandlers): (s: GameState) => void {
  root.innerHTML = `
    <div class="top">
      <div class="panel">
        <div class="title">ROMAN × QIN BATTLE</div>
        <div class="msg" id="msg"></div>
        <div class="btns" style="margin-top:8px" id="main-btns"></div>
      </div>
      <div class="panel help" id="help"></div>
    </div>
    <div class="bottom">
      <div class="cards" id="cards"></div>
      <div class="panel btns" id="form-btns"></div>
    </div>
    <div class="panel banner-end" id="end" style="display:none"></div>
  `;

  const msg = root.querySelector('#msg') as HTMLElement;
  const cards = root.querySelector('#cards') as HTMLElement;
  const mainBtns = root.querySelector('#main-btns') as HTMLElement;
  const formBtns = root.querySelector('#form-btns') as HTMLElement;
  const help = root.querySelector('#help') as HTMLElement;
  const end = root.querySelector('#end') as HTMLElement;

  help.innerHTML = `
    <b>Điều khiển</b><br/>
    Kéo / Click chọn đơn vị<br/>
    Click phải = ra lệnh di chuyển<br/>
    <b>Q/E</b> xoay · <b>1-4</b> đội hình<br/>
    <b>Space</b> bắt đầu · <b>P</b> tạm dừng<br/>
    <b>R</b> chơi lại · Cuộn = zoom · WASD/kéo giữa = camera
  `;

  formBtns.innerHTML = FORMS.map(
    (f) => `<button data-form="${f.id}" title="${f.key}">${f.key}. ${f.label}</button>`,
  ).join('');
  formBtns.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button[data-form]') as HTMLElement | null;
    if (t) handlers.onForm(t.dataset.form as FormationKind);
  });

  return (s: GameState) => {
    msg.textContent = s.message + (s.paused ? ' [TẠM DỪNG]' : '');

    mainBtns.innerHTML = '';
    if (s.phase === 'deploy') {
      const b = document.createElement('button');
      b.className = 'primary';
      b.textContent = '⚔ Bắt đầu chiến đấu (Space)';
      b.onclick = () => handlers.onStart();
      mainBtns.appendChild(b);
    } else {
      const p = document.createElement('button');
      p.textContent = s.paused ? '▶ Tiếp tục (P)' : '⏸ Tạm dừng (P)';
      p.onclick = () => handlers.onPause();
      mainBtns.appendChild(p);
    }
    const r = document.createElement('button');
    r.textContent = '↻ Chơi lại (R)';
    r.onclick = () => handlers.onRestart();
    mainBtns.appendChild(r);

    const sel = selectedUnit(s);
    formBtns.querySelectorAll('button').forEach((btn) => {
      const id = (btn as HTMLElement).dataset.form;
      btn.classList.toggle('active', !!sel && sel.formation === id);
    });

    const playerUnits = s.units.filter((u) => u.faction === s.playerFaction);
    const enemyUnits = s.units.filter((u) => u.faction !== s.playerFaction);
    cards.innerHTML = '';
    for (const u of [...playerUnits, ...enemyUnits]) {
      cards.appendChild(makeCard(u, u.id === s.selectedId, handlers));
    }

    if (s.phase === 'ended') {
      end.style.display = 'block';
      end.innerHTML = `<h2>${s.winner === s.playerFaction ? 'CHIẾN THẮNG' : 'THẤT BẠI'}</h2>
        <p style="color:#9aa0a6;margin-bottom:12px">${s.message}</p>
        <button class="primary" id="again">Chơi lại</button>`;
      end.querySelector('#again')?.addEventListener('click', () => handlers.onRestart());
    } else {
      end.style.display = 'none';
    }

    void setFormation;
    void startBattle;
    void restart;
  };
}

function makeCard(u: Unit, selected: boolean, handlers: HudHandlers): HTMLElement {
  const def = defOf(u);
  const el = document.createElement('div');
  el.className = `card ${u.faction}${selected ? ' selected' : ''}`;
  el.innerHTML = `
    <div class="name">${def.nameVi}</div>
    <div class="meta">${def.nameEn} · ${aliveCount(u)} lính${u.routing ? ' · RÚT' : ''}</div>
    <div class="bar"><span style="width:${Math.max(0, (u.hp / u.maxHp) * 100)}%"></span></div>
  `;
  if (u.faction === 'rome') {
    el.onclick = () => handlers.onSelect(u.id);
  }
  return el;
}
