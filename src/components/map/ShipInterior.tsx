import type { ReactNode } from 'react'
import { BatteryCharging, DoorOpen, Droplets, HeartPulse, Radio, ShieldCheck, Sprout, Utensils, X } from 'lucide-react'
import type { GameState } from '../../engine/types'

export function ShipInterior({ game, onExit }: { game: GameState; onExit: () => void }) {
  const sheltered = game.crewTask === 'shelter'
  return <section role="dialog" aria-modal="true" aria-labelledby="ship-interior-title" className="fixed inset-0 z-[100] overflow-hidden bg-[#29273d] text-white">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,#59435c_0%,#39334d_52%,#25293c_100%)]"/>
    <header className="relative z-10 flex h-[82px] items-center justify-between gap-5 border-b border-white/15 bg-[#302b46]/90 px-7 shadow-xl backdrop-blur-lg">
      <div className="flex min-w-[290px] items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl border-2 border-[#f8d3a5] bg-[#e4875f] text-[#392e49] shadow-lg"><ShieldCheck size={23}/></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#f4c58e]">Base Marte · Valle de Ares</p><h1 id="ship-interior-title" className="text-lg font-black">A bordo del hábitat</h1></div></div>
      <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/20 px-4 py-2"><span className="text-[9px] font-black uppercase tracking-wider text-[#f5d4a3]">Bitácora de misión</span><span className="h-5 w-px bg-white/20"/><span className="text-sm font-black">Sol {String(game.sol).padStart(2, '0')} / {game.maxSols}</span><span className="h-5 w-px bg-white/20"/><span className="flex items-center gap-1.5 text-[10px] font-black"><HeartPulse size={15} className={game.lifeSupport === 'critical' ? 'text-[#ff9c82]' : 'text-[#a8efc5]'}/>{game.lifeSupport === 'stable' ? 'ESTABLE' : game.lifeSupport === 'risk' ? 'RESERVAS BAJAS' : 'CRÍTICO'}</span></div>
      <button type="button" onClick={onExit} aria-label="Salir de la nave y volver al mapa" className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border-2 border-white/25 bg-[#e8835b] px-4 text-xs font-black text-[#392e49] shadow-lg transition-colors hover:bg-[#ffad75] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"><DoorOpen size={17}/> Regresar al valle <X size={15}/></button>
    </header>

    <div className="relative z-10 mx-auto grid h-[calc(100dvh-82px)] min-h-[700px] max-w-[1760px] grid-cols-[220px_minmax(640px,1fr)_220px] items-center gap-4 px-6 py-5">
      <aside aria-label="Lecturas de la colonia" className="space-y-3">
        <Readout icon={<BatteryCharging size={17}/>} label="Energía" value={game.resources.energy} color="bg-[#f0c34f]"/>
        <Readout icon={<Droplets size={17}/>} label="Agua" value={game.resources.water} color="bg-[#68c5e6]"/>
        <Readout icon={<Utensils size={17}/>} label="Comida" value={game.resources.food} color="bg-[#ed8b62]"/>
        <section className="rounded-2xl border border-white/15 bg-[#272a40]/90 p-4 shadow-xl"><h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#c7f1d9]"><Sprout size={15}/> Próxima jornada</h2><p className="mt-2 text-[11px] font-bold leading-5 text-white/80">Al terminar el sol, los paneles recargan energía y el soporte vital atiende a la tripulación.</p><p className="mt-2 text-[10px] font-extrabold text-[#f2c980]">{sheltered ? 'La compuerta mantiene al equipo a resguardo.' : 'La compuerta está lista para el siguiente recorrido.'}</p></section>
      </aside>

      <main aria-label="Vista del interior de la nave" className="relative h-[min(78vh,760px)] min-h-[600px] overflow-hidden rounded-[2.4rem] border-[10px] border-[#d4c5ae] bg-[#485469] shadow-[0_35px_100px_#111322aa,inset_0_0_0_5px_#867d80]">
        <svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Interior cálido del hábitat con un gran ventanal al valle marciano, una astronauta y NOVA" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="cabin-wall" x2="0" y2="1"><stop stopColor="#536078"/><stop offset=".54" stopColor="#42465c"/><stop offset="1" stopColor="#302f46"/></linearGradient>
            <linearGradient id="mars-sky" x2="0" y2="1"><stop stopColor="#f6bd83"/><stop offset=".48" stopColor="#da805f"/><stop offset="1" stopColor="#8d5060"/></linearGradient>
            <linearGradient id="mars-ground" x2="0" y2="1"><stop stopColor="#c77a58"/><stop offset="1" stopColor="#653c4e"/></linearGradient>
            <linearGradient id="cabin-floor" x2="0" y2="1"><stop stopColor="#696477"/><stop offset="1" stopColor="#252a40"/></linearGradient>
            <linearGradient id="glass-shine" x2="1" y2="1"><stop stopColor="#d9f5f1" stopOpacity=".34"/><stop offset=".55" stopColor="#d9f5f1" stopOpacity="0"/><stop offset="1" stopColor="#fff0d5" stopOpacity=".18"/></linearGradient>
            <filter id="soft-glow"><feGaussianBlur stdDeviation="10"/></filter>
            <clipPath id="panorama-clip"><rect x="160" y="88" width="960" height="325" rx="126"/></clipPath>
          </defs>
          <rect width="1280" height="720" fill="url(#cabin-wall)"/>
          <path d="M0 0H1280V110Q1000 150 640 120T0 152Z" fill="#706b79" opacity=".35"/>
          <path d="M34 0v488m50-488v485m1112-485v485m50-485v485" stroke="#b6a995" strokeOpacity=".28" strokeWidth="8"/>
          <g clipPath="url(#panorama-clip)">
            <rect x="160" y="88" width="960" height="325" fill="url(#mars-sky)"/>
            <circle cx="987" cy="159" r="43" fill="#ffe2a0" opacity=".9"/>
            <circle cx="987" cy="159" r="68" fill="#ffd38a" opacity=".2" filter="url(#soft-glow)"/>
            <path d="M155 292 275 194l90 62 129-118 106 132 96-94 140 118 127-99 161 92v135H155Z" fill="#9f5860"/>
            <path d="m225 274 140-95 91 71 38-37 80 89 115-76 89 65 96-52 149 80v110H155Z" fill="#b56855"/>
            <path d="M150 328q184-83 355-12t347 3 292 24v93H150Z" fill="url(#mars-ground)"/>
            <path d="M183 364q203-38 380 9t354-3 234 12" fill="none" stroke="#e7a174" strokeWidth="13" opacity=".75"/>
            <path d="M245 386 365 330l103 56m492-25 70-58 76 39" fill="none" stroke="#563b4c" strokeWidth="13" opacity=".72"/>
            <g transform="translate(782 318) scale(.55)"><path d="m0 82 150-80 155 80-155 84Z" fill="#573c50"/><path d="M61 75V-17q94-68 187 0v92" fill="#e8ddc7" stroke="#51455b" strokeWidth="14"/><path d="M91 46V-3q62-48 125 0v49" fill="#5f7f8f" stroke="#354257" strokeWidth="12"/><circle cx="154" cy="-20" r="12" fill="#ffe38c"/></g>
            <g transform="translate(389 319) scale(.42)"><path d="m0 50 94-52 99 52-99 52Z" fill="#3c4f6a"/><path d="m20 43 74-44 75 44-75 41Z" fill="#56a0bc" stroke="#d5e3d8" strokeWidth="9"/><path d="M93 80v55" stroke="#d4c4a6" strokeWidth="12"/></g>
            <rect x="160" y="88" width="960" height="325" fill="url(#glass-shine)"/>
          </g>
          <rect x="147" y="75" width="986" height="351" rx="140" fill="none" stroke="#d2c2ac" strokeWidth="24"/>
          <rect x="165" y="92" width="950" height="317" rx="125" fill="none" stroke="#8ba2a7" strokeOpacity=".75" strokeWidth="7"/>
          <path d="M640 93v313M164 250h950" stroke="#c5b7a8" strokeOpacity=".85" strokeWidth="11"/>
          <g fill="#ffe1aa" stroke="#51485d" strokeWidth="6"><circle cx="180" cy="182" r="12"/><circle cx="1100" cy="182" r="12"/><circle cx="180" cy="319" r="12"/><circle cx="1100" cy="319" r="12"/></g>
          <rect y="446" width="1280" height="16" fill="#b6a997"/><rect y="464" width="1280" height="26" fill="#393b52"/>
          <path d="M0 489H1280V720H0Z" fill="url(#cabin-floor)"/>
          <path d="M0 501q320 82 640 38t640-40" fill="none" stroke="#9f9aa1" strokeOpacity=".44" strokeWidth="9"/>
          <path d="M0 684q330-82 640-47t640 35" fill="none" stroke="#d3a275" strokeOpacity=".38" strokeWidth="4"/>
          <path d="M159 501 72 720m253-210 22 210m828-214 89 214m-263-213-22 213" stroke="#b5aeb1" strokeOpacity=".22" strokeWidth="5"/>
          <g transform="translate(56 425)"><path d="M0 44 74 0h255l71 44v140H0Z" fill="#252d44" stroke="#b7aa98" strokeWidth="10"/><path d="M25 55h115v66H25Z" rx="9" fill="#244459" stroke="#91ced0" strokeWidth="5"/><path d="M43 98h80m-80-23h54" stroke="#63d9d6" strokeWidth="6" strokeLinecap="round"/><path d="M161 55h97v12h-97zm0 28h137v12H161zm0 28h84v12h-84z" fill="#d2bc94"/><circle cx="319" cy="69" r="15" fill="#e3a25e"/><circle cx="319" cy="120" r="15" fill="#74cbb5"/></g>
          <g transform="translate(865 428)"><path d="M0 43 63 0h277l63 43v138H0Z" fill="#263249" stroke="#b5a793" strokeWidth="10"/><rect x="25" y="28" width="147" height="74" rx="12" fill="#243d52" stroke="#6dd6cf" strokeWidth="5"/><path d="M42 81 70 59l22 10 32-29 30 27" fill="none" stroke="#83e6ce" strokeWidth="6"/><path d="M202 35h160v10H202zm0 24h130v10H202zm0 24h146v10H202z" fill="#d5c196"/><circle cx="65" cy="139" r="14" fill="#efc972"/><circle cx="117" cy="139" r="14" fill="#da745b"/><circle cx="169" cy="139" r="14" fill="#6fc5ce"/></g>
          <g transform="translate(636 525)" aria-hidden="true" className="ship-astronaut-idle">
            <ellipse cy="142" rx="80" ry="18" fill="#171f31" opacity=".5"/>
            <path d="M-39-7q-39-9-48 28l12 42q15 9 39 0m76-70q39-9 48 28L76 63q-15 9-39 0" fill="#d38459" stroke="#34364f" strokeWidth="11" strokeLinejoin="round"/>
            <rect x="-28" y="-2" width="56" height="112" rx="20" fill="#ece4d4" stroke="#42435b" strokeWidth="10"/><rect x="-18" y="18" width="36" height="27" rx="7" fill="#31455c" stroke="#78d8dc" strokeWidth="5"/><path d="M-15 72h30v19h-30Z" fill="#d67b55" stroke="#444056" strokeWidth="5"/>
            <path d="M-22 100-39 132l17 12 27-31m17-13 17 32-17 12-27-31" fill="#44536a" stroke="#eee4d4" strokeWidth="9" strokeLinejoin="round"/>
            <path d="m-39 132-6 16 31 8 11-16-16-8m65 0 6 16-31 8-11-16 16-8" fill="#333a51" stroke="#e4d5c1" strokeWidth="7" strokeLinejoin="round"/>
            <circle cy="-48" r="45" fill="#f4ead8" stroke="#3e3c56" strokeWidth="10"/><path d="M-37-48a37 37 0 0 1 74 0v17h-74Z" fill="#203650" stroke="#65dfe2" strokeWidth="8"/><path d="m-23-49 10-8m48 8-10-8" stroke="#f1fff4" strokeWidth="6" strokeLinecap="round"/><circle cx="-47" cy="-42" r="10" fill="#ffd96d" stroke="#484358" strokeWidth="5"/><circle cx="47" cy="-42" r="10" fill="#ffd96d" stroke="#484358" strokeWidth="5"/>
          </g>
          <g transform="translate(490 498)" aria-hidden="true" className="ship-nova-float"><ellipse cy="37" rx="28" ry="8" fill="#182033" opacity=".45"/><rect x="-29" y="-14" width="58" height="49" rx="18" fill="#efe6d7" stroke="#47435d" strokeWidth="6"/><rect x="-21" y="-7" width="42" height="27" rx="11" fill="#222a4d"/><path d="M-12 7q5-8 10 0m6 0q5-8 10 0" fill="none" stroke="#5af2e9" strokeWidth="4" strokeLinecap="round"/><path d="M0-14v-11" stroke="#50445e" strokeWidth="5"/><circle cy="-27" r="5" fill="#ffdc72" stroke="#50445e" strokeWidth="3"/><circle cx="-33" cy="8" r="5" fill="#ffd077"/><circle cx="33" cy="8" r="5" fill="#ffd077"/></g>
          <g transform="translate(1070 180)"><path d="M0 0v183" stroke="#e0c99f" strokeWidth="12"/><path d="m-53 187 53-35 53 35-53 34Z" fill="#393b52" stroke="#d5c3a7" strokeWidth="8"/><circle cy="24" r="26" fill="#e3845e" stroke="#3a354d" strokeWidth="8"/><path d="M-17 24a17 17 0 0 1 34 0" fill="none" stroke="#f7dda9" strokeWidth="5"/></g>
          <g transform="translate(640 42)"><rect x="-145" y="-4" width="290" height="42" rx="20" fill="#292b42" stroke="#eee0c5" strokeWidth="3"/><text y="23" textAnchor="middle" fill="#fff1d7" fontSize="15" fontWeight="900" letterSpacing="3">VENTANAL · VALLE DE ARES</text></g>
        </svg>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/15 bg-[#28283f]/85 px-5 py-2 text-[10px] font-extrabold text-[#f5ddb5] shadow-lg">Comunicaciones activas · compuerta sellada · NOVA en cabina</div>
      </main>

      <aside aria-label="Sistemas de la nave" className="space-y-3">
        <section className="rounded-2xl border border-white/15 bg-[#272a40]/90 p-4 shadow-xl"><h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#bce8e9]"><Radio size={15}/> Consola de misión</h2><p className="mt-3 text-sm font-black text-white">{sheltered ? 'Refugio activado' : game.lifeSupport === 'critical' ? 'Reserva crítica' : 'Hábitat operativo'}</p><p className="mt-1 text-[10px] leading-4 text-white/65">{sheltered ? 'La tripulación permanecerá dentro hasta terminar el sol.' : 'La colonia mantiene el enlace y las lecturas de soporte.'}</p><div className="mt-3 flex gap-1.5" aria-label="Estado de los sistemas"><span className="h-2 flex-1 rounded-full bg-[#69d2a2]"/><span className="h-2 flex-1 rounded-full bg-[#69d2a2]"/><span className={`h-2 flex-1 rounded-full ${game.lifeSupport === 'critical' ? 'bg-[#e27566]' : game.lifeSupport === 'risk' ? 'bg-[#efbd68]' : 'bg-[#69d2a2]'}`}/></div></section>
        <section className="rounded-2xl border border-white/15 bg-[#272a40]/90 p-4 shadow-xl"><h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#f4ca91]"><ShieldCheck size={15}/> Compuerta</h2><p className="mt-2 text-[11px] font-bold leading-5 text-white/80">{sheltered ? 'Sellada contra la tormenta solar.' : 'Lista para la próxima salida al valle.'}</p><p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-extrabold text-white/65">Punto de acceso · módulo A1</p></section>
        <section className="rounded-2xl border border-[#e9cb9e]/40 bg-[#755045]/75 p-4 shadow-xl"><h2 className="text-[10px] font-black uppercase tracking-[.14em] text-[#ffe5b4]">Siguiente paso</h2><p className="mt-2 text-[11px] font-bold leading-5 text-white/85">{sheltered ? 'Espera a que termine la jornada para volver al exterior.' : 'Puedes volver al valle y continuar tu recorrido cuando quieras.'}</p></section>
      </aside>
    </div>
  </section>
}

function Readout({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  const capped = Math.min(100, value)
  return <section className="rounded-2xl border border-white/15 bg-[#272a40]/90 p-4 shadow-xl"><h2 className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[.13em] text-white/70"><span>{label}</span><span className="text-[#d7c3a2]">{icon}</span></h2><p className="mt-2 text-2xl font-black tabular-nums text-white">{value}<span className="ml-1 text-xs font-bold text-white/45">/100</span></p><progress aria-label={`${label}: ${value} de 100`} max={100} value={capped} className={`mt-2 h-2 w-full overflow-hidden rounded-full ${color}`}/></section>
}
