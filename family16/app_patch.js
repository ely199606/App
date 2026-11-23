// Family navigation is separate from browser history: Android Back always stays in the app.
const familyHistory=[];
function changePage(x,remember=true){
 clearTimeout(toastTimer);document.getElementById('toast')?.classList.remove('show');
 if(x==='habitos'||x==='enfoque')x='planner';
 if(x==='avatar'||x==='juego')x='recursos';
 if(!['inicio','planner','recursos','estrategias','familia','calma','avisos','examenes','ajustes'].includes(x))x='inicio';
 if(x==='inicio')familyHistory.length=0;
 else if(remember&&page!==x)familyHistory.push(page);
 clearCompanionMessage();cleanupGames();exerciseStop();
 if(x!=='calma')stopMelody();
 avatarGesture='';page=x;modal='';render();window.scrollTo({top:0,behavior:'instant'});
}
function goBackInsideApp(){
 if(modal){modal='';render();return true;}
 if(page==='avisos'){
  const detailBack=document.querySelector('.notice-detail [data-notice-action="back"],.notice-page>[data-notice-action="back"]');
  if(detailBack){detailBack.click();return true;}
 }
 if(familyHistory.length){const previous=familyHistory.pop();changePage(previous,false);}
 else if(page!=='inicio')changePage('inicio',false);
 else toast('Estás en el inicio.');
 return true;
}
window.AppSchoolingNavigation=Object.freeze({back:goBackInsideApp});
function familyPlanner(){
 const p=current(),d=dateSelected,tasks=p.tasks.filter(x=>x.date===d),done=tasks.filter(x=>x.done).length;
 const day=new Date(d+'T12:00:00'),monday=new Date(day);monday.setDate(day.getDate()-(day.getDay()+6)%7);
 return `<section class="family16-planner-page">${window.AppSchoolingFamily.helper(p,'Planner familiar','Anota una actividad para acompañar a tu hijo/a y elige el día. Puedes cambiar el plan cuando lo necesiten.')}<div class="card family16-planner-card"><div class="section-title" style="margin-top:0"><h2>Organizamos la semana</h2><button type="button" class="button small" data-action="modal" data-modal="taskNew">+ Nueva actividad</button></div><div class="mini-week">${Array.from({length:7},(_,i)=>{const x=new Date(monday);x.setDate(x.getDate()+i);const iso=dateKey(x);return `<button type="button" class="day ${d===iso?'active':''}" data-action="date" data-date="${iso}" aria-label="${e(longDate(iso))}" ${d===iso?'aria-pressed="true"':'aria-pressed="false"'}>${DAYS[x.getDay()]}<b>${x.getDate()}</b></button>`}).join('')}</div><div class="section-title"><h2>${e(longDate(d))}</h2><span class="badge">${done}/${tasks.length}</span></div>${tasks.length?tasks.map(t=>`<div class="task-row"><div class="row-main"><b style="${t.done?'text-decoration:line-through;opacity:.7':''}">${e(t.title)}</b><small>${cats[t.cat]?.name||'Actividad familiar'}</small></div><button type="button" class="check-circle ${t.done?'done':''}" data-action="taskToggle" data-id="${e(t.id)}" aria-label="${t.done?'Marcar pendiente':'Completar'}: ${e(t.title)}">${t.done?'✓':''}</button><button type="button" class="link-btn" data-action="taskDelete" data-id="${e(t.id)}" aria-label="Quitar actividad: ${e(t.title)}">×</button></div>`).join(''):'<p class="family16-planner-empty">No hay actividades para este día.<br>Pueden elegir un paso pequeño para comenzar.</p>'}</div></section>`;
}
function familySettings(){
 const p=current();
 return `<section class="family16-family-settings">${window.AppSchoolingFamily.helper(p,'Mi familia','Los avisos del colegio y tu planificación siguen disponibles. Puedes guardar una copia de tu plan.')}<div class="card"><h2>Plan seleccionado</h2><p>${e(p.name)}</p>${state.profiles.length>1?`<div class="family16-profile-options">${state.profiles.map(profile=>`<button type="button" class="button ${profile.id===p.id?'':'secondary'}" data-action="profileSwitch" data-id="${e(profile.id)}" aria-pressed="${profile.id===p.id}">${e(profile.name)}</button>`).join('')}</div>`:''}</div>${noticeSettingsCard()}<div class="card"><h2>Respaldo de la planificación</h2><p>Guarda una copia de los datos que tienes en este dispositivo.</p><div class="form-actions"><button type="button" class="button" data-action="export">Guardar copia</button><button type="button" class="button secondary" data-action="modal" data-modal="import">Importar una copia</button></div></div></section>`;
}
